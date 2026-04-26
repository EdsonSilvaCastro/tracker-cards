import { supabaseAdmin } from '../config/supabase.js';
import { recordAliasUsage } from './merchantMatching.js';

/**
 * Crea un nuevo expense en `general_expenses` con budgeted_amount=0 y
 * actual_spent=amount, lo marca como auto_created y guarda el alias del
 * merchant para que futuros matches funcionen automáticamente.
 */
export async function autoCreateExpenseAndLink({
  merchant,
  amount,
  cardId,
  billingMonth,
  billingYear,
  userId,
}) {
  const expenseName = capitalizeMerchant(merchant);

  const { data: newExpense, error: createError } = await supabaseAdmin
    .from('monthly_budget_expenses')
    .insert({
      user_id: userId,
      month: billingMonth,
      year: billingYear,
      section: 'general_expenses',
      name: expenseName,
      budgeted_amount: 0,
      actual_spent: amount,
      status: 'paid',
      paid_with: cardId,
      auto_created: true,
    })
    .select()
    .single();

  if (createError) throw createError;

  // Guardar alias para futuros matches automáticos
  await recordAliasUsage(merchant, newExpense, userId);

  return newExpense;
}

/**
 * "rappi" → "Rappi"
 * "claude api" → "Claude API"
 * Palabras de ≤3 letras en minúsculas se asumen acrónimos (api, vpn, ssh).
 */
function capitalizeMerchant(merchant) {
  return merchant
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length <= 3 && word === word.toLowerCase()) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
