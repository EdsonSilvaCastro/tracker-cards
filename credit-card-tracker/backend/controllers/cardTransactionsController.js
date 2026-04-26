import { supabaseAdmin } from '../config/supabase.js';
import { calculateBillingCycle, isInAmbiguousZone } from '../utils/billingCycle.js';
import { findMatchingExpense, recordAliasUsage } from '../utils/merchantMatching.js';
import { autoCreateExpenseAndLink } from '../utils/autoCreateExpense.js';

// ---------------------------------------------------------------------------
// POST /api/card-transactions
// ---------------------------------------------------------------------------
export const createTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      card_id,
      amount,
      merchant,
      transaction_date,
      linked_expense_id,
      confirmed_billing_month,
      confirmed_billing_year,
      source = 'manual',
      notes,
    } = req.body;

    if (!card_id || !amount || !merchant) {
      return res.status(400).json({ success: false, error: 'card_id, amount y merchant son requeridos.' });
    }

    // Buscar la tarjeta para obtener cutoff_day
    const { data: card, error: cardError } = await supabaseAdmin
      .from('credit_cards')
      .select('id, card_name, cutoff_day, is_active')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ success: false, error: 'Tarjeta no encontrada.' });
    }

    if (!card.is_active) {
      return res.status(400).json({ success: false, error: 'La tarjeta no está activa.' });
    }

    const txDate = transaction_date ? new Date(transaction_date) : new Date();
    const cutoff = card.cutoff_day || 1;

    let billingMonth, billingYear;

    if (confirmed_billing_month && confirmed_billing_year) {
      // El cliente ya confirmó cuál ciclo usar
      billingMonth = parseInt(confirmed_billing_month);
      billingYear = parseInt(confirmed_billing_year);
    } else if (isInAmbiguousZone(txDate, cutoff)) {
      // Zona ambigua — pedir confirmación antes de guardar
      const { billingMonth: suggestedMonth, billingYear: suggestedYear } = calculateBillingCycle(txDate, cutoff);
      const altMonth = suggestedMonth === 1 ? 12 : suggestedMonth - 1;
      const altYear = suggestedMonth === 1 ? suggestedYear - 1 : suggestedYear;

      return res.status(409).json({
        ambiguous: true,
        options: [
          {
            billing_month: altMonth,
            billing_year: altYear,
            label: `${monthName(altMonth)} ${altYear} (ciclo anterior de ${card.card_name})`,
          },
          {
            billing_month: suggestedMonth,
            billing_year: suggestedYear,
            label: `${monthName(suggestedMonth)} ${suggestedYear} (siguiente ciclo de ${card.card_name})`,
          },
        ],
        suggested: { billing_month: suggestedMonth, billing_year: suggestedYear },
      });
    } else {
      ({ billingMonth, billingYear } = calculateBillingCycle(txDate, cutoff));
    }

    // Resolver linked_expense_id si no viene explícito (matching por alias)
    let resolvedExpenseId = linked_expense_id || null;
    let autoCreatedExpense = null;
    if (!resolvedExpenseId) {
      const matched = await findMatchingExpense(merchant, billingMonth, billingYear, userId);
      if (matched) {
        resolvedExpenseId = matched.id;
      } else {
        // Sin match — auto-crear expense en General expenses si el cliente lo permite
        const shouldAutoCreate = req.body.auto_create_expense !== false; // default true
        if (shouldAutoCreate) {
          try {
            autoCreatedExpense = await autoCreateExpenseAndLink({
              merchant: merchant.trim(),
              amount: parseFloat(amount),
              cardId: card_id,
              billingMonth,
              billingYear,
              userId,
            });
            resolvedExpenseId = autoCreatedExpense.id;
          } catch (err) {
            console.error('Auto-create expense failed:', err);
            // Continuar sin vincular si falla
          }
        }
      }
    }

    // Insertar transacción
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('card_transactions')
      .insert({
        user_id: userId,
        card_id,
        amount: parseFloat(amount),
        merchant: merchant.trim(),
        transaction_date: txDate.toISOString().split('T')[0],
        billing_month: billingMonth,
        billing_year: billingYear,
        linked_expense_id: resolvedExpenseId,
        source,
        notes: notes || null,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Actualizar actual_spent del expense vinculado
    // (si fue auto-creado, actual_spent ya se insertó con el monto correcto; no sumar de nuevo)
    if (resolvedExpenseId && !autoCreatedExpense) {
      await updateExpenseSpent(resolvedExpenseId, parseFloat(amount));

      // Guardar alias para próximas veces si viene de matching automático y no era explícito
      if (!linked_expense_id) {
        const { data: expense } = await supabaseAdmin
          .from('monthly_budget_expenses')
          .select('*')
          .eq('id', resolvedExpenseId)
          .single();
        if (expense) await recordAliasUsage(merchant, expense, userId);
      }
    }

    // Obtener el expense vinculado para incluirlo en la respuesta
    let linkedExpense = autoCreatedExpense || null;
    if (resolvedExpenseId && !linkedExpense) {
      const { data: exp } = await supabaseAdmin
        .from('monthly_budget_expenses')
        .select('id, name, section')
        .eq('id', resolvedExpenseId)
        .single();
      linkedExpense = exp || null;
    }

    res.status(201).json({
      success: true,
      data: transaction,
      linked_expense: linkedExpense,
      auto_created: !!autoCreatedExpense,
    });
  } catch (error) {
    console.error('Error creating card transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/card-transactions
// ---------------------------------------------------------------------------
export const getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      card_id,
      billing_month,
      billing_year,
      from,
      to,
      limit = 50,
    } = req.query;

    const today = new Date();
    const filterMonth = billing_month ? parseInt(billing_month) : today.getMonth() + 1;
    const filterYear = billing_year ? parseInt(billing_year) : today.getFullYear();

    let query = supabaseAdmin
      .from('card_transactions')
      .select(`
        *,
        credit_cards (id, card_name, bank),
        monthly_budget_expenses (id, name, section)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(parseInt(limit));

    if (card_id) query = query.eq('card_id', card_id);
    if (from) query = query.gte('transaction_date', from);
    if (to) query = query.lte('transaction_date', to);

    // Si no hay rango de fechas, filtrar por billing cycle
    if (!from && !to) {
      query = query.eq('billing_month', filterMonth).eq('billing_year', filterYear);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching card transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/card-transactions/:id
// ---------------------------------------------------------------------------
export const updateTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, merchant, transaction_date, linked_expense_id, notes } = req.body;

    // Obtener la transacción actual
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('card_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Transacción no encontrada.' });
    }

    const updates = {};

    // Si cambia transaction_date, recalcular billing cycle
    if (transaction_date && transaction_date !== existing.transaction_date) {
      const { data: card } = await supabaseAdmin
        .from('credit_cards')
        .select('cutoff_day')
        .eq('id', existing.card_id)
        .single();

      const { billingMonth, billingYear } = calculateBillingCycle(
        new Date(transaction_date),
        card?.cutoff_day || 1
      );
      updates.transaction_date = transaction_date;
      updates.billing_month = billingMonth;
      updates.billing_year = billingYear;
    }

    // Si cambia linked_expense_id, ajustar actual_spent del expense viejo y nuevo
    if (linked_expense_id !== undefined && linked_expense_id !== existing.linked_expense_id) {
      const oldAmount = parseFloat(existing.amount);
      const newAmount = parseFloat(amount || existing.amount);

      if (existing.linked_expense_id) {
        await updateExpenseSpent(existing.linked_expense_id, -oldAmount);
      }
      if (linked_expense_id) {
        await updateExpenseSpent(linked_expense_id, newAmount);
      }
      updates.linked_expense_id = linked_expense_id || null;
    } else if (amount && parseFloat(amount) !== parseFloat(existing.amount)) {
      // Solo cambió el monto, mismo expense
      const diff = parseFloat(amount) - parseFloat(existing.amount);
      if (existing.linked_expense_id) {
        await updateExpenseSpent(existing.linked_expense_id, diff);
      }
    }

    if (amount) updates.amount = parseFloat(amount);
    if (merchant) updates.merchant = merchant.trim();
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabaseAdmin
      .from('card_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating card transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/card-transactions/:id
// ---------------------------------------------------------------------------
export const deleteTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('card_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Transacción no encontrada.' });
    }

    // Restar del expense vinculado antes de borrar
    if (existing.linked_expense_id) {
      await updateExpenseSpent(existing.linked_expense_id, -parseFloat(existing.amount));
    }

    const { error } = await supabaseAdmin
      .from('card_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting card transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/card-transactions/merchants/autocomplete?q=
// ---------------------------------------------------------------------------
export const getMerchantAutocomplete = async (req, res) => {
  try {
    const userId = req.userId;
    const q = req.query.q || '';

    let query = supabaseAdmin
      .from('card_transactions')
      .select('merchant')
      .eq('user_id', userId);

    if (q) {
      query = query.ilike('merchant', `%${q}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    // Agrupar y ordenar por frecuencia
    const freq = {};
    for (const row of data) {
      const key = row.merchant;
      freq[key] = (freq[key] || 0) + 1;
    }

    const suggestions = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([merchant, count]) => ({ merchant, count }));

    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error fetching merchant autocomplete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Helper: ajustar actual_spent de un expense
// ---------------------------------------------------------------------------
async function updateExpenseSpent(expenseId, delta) {
  const { data: expense } = await supabaseAdmin
    .from('monthly_budget_expenses')
    .select('actual_spent, budgeted_amount, status')
    .eq('id', expenseId)
    .single();

  if (!expense) return;

  const newSpent = Math.max(0, parseFloat(expense.actual_spent || 0) + delta);
  const newStatus = newSpent >= parseFloat(expense.budgeted_amount || 0) ? 'paid' : 'pending';

  await supabaseAdmin
    .from('monthly_budget_expenses')
    .update({ actual_spent: newSpent, status: newStatus })
    .eq('id', expenseId);
}

function monthName(m) {
  return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
          'septiembre','octubre','noviembre','diciembre'][m - 1];
}
