import { supabaseAdmin } from '../config/supabase.js';

export function normalizeMerchant(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Busca si existe un alias guardado para el merchant y, si existe,
 * intenta encontrar el expense del mes/año de facturación correspondiente.
 * Retorna el expense encontrado o null.
 */
export async function findMatchingExpense(merchant, billingMonth, billingYear, userId) {
  if (!merchant) return null;

  const normalized = normalizeMerchant(merchant);

  const { data: alias } = await supabaseAdmin
    .from('merchant_aliases')
    .select('*')
    .eq('merchant_normalized', normalized)
    .eq('user_id', userId)
    .single();

  if (!alias) return null;

  // Buscar el expense del mes en curso por nombre y sección (no por UUID, ya que cada mes crea nuevos)
  const { data: expense } = await supabaseAdmin
    .from('monthly_budget_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('month', billingMonth)
    .eq('year', billingYear)
    .eq('name', alias.expense_name)
    .eq('section', alias.expense_section)
    .single();

  return expense || null;
}

/**
 * Guarda o actualiza un alias merchant → expense para uso futuro.
 */
export async function recordAliasUsage(merchant, expense, userId) {
  if (!merchant || !expense) return;

  const normalized = normalizeMerchant(merchant);

  await supabaseAdmin
    .from('merchant_aliases')
    .upsert(
      {
        user_id: userId,
        merchant_normalized: normalized,
        expense_template_id: expense.id,
        expense_name: expense.name,
        expense_section: expense.section,
        use_count: 1,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,merchant_normalized' }
    );
}
