import { parseExpenseMessage } from '../services/claudeService.js';
import { sendMessage, isAuthorized } from '../services/telegramService.js';
import { calculateBillingCycle, isInAmbiguousZone } from '../utils/billingCycle.js';
import { findMatchingExpense, recordAliasUsage } from '../utils/merchantMatching.js';
import { supabaseAdmin } from '../config/supabase.js';

// Estado conversacional en memoria (simple, para uso personal de un solo usuario)
const conversationState = new Map();

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook  — Telegram llama aquí en cada mensaje
// ---------------------------------------------------------------------------
export async function handleWebhook(req, res) {
  // Siempre responder 200 rápido para que Telegram no reintente
  res.sendStatus(200);

  const update = req.body;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  if (!chatId || !text) return;

  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, 'No autorizado.');
    return;
  }

  try {
    await processMessage(chatId, text);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    await sendMessage(chatId, '⚠️ Error al procesar tu mensaje. Intenta de nuevo.');
  }
}

async function processMessage(chatId, text) {
  // Comandos básicos
  if (text === '/start' || text === '/help') {
    await sendMessage(
      chatId,
      'Mándame un gasto en lenguaje natural, ej:\n_"500 amex platinum en salidas finde"_\n\n/cancel para cancelar una operación en curso.'
    );
    return;
  }

  if (text === '/cancel') {
    conversationState.delete(chatId);
    await sendMessage(chatId, 'Cancelado. ✅');
    return;
  }

  // Recuperar estado previo si existe
  const prev = conversationState.get(chatId);

  // Manejo de confirmación de billing cycle ambiguo
  if (prev?.awaitingBillingConfirmation) {
    await handleBillingConfirmation(chatId, text, prev);
    return;
  }

  // Cargar tarjetas activas y expenses del mes en curso
  const { data: activeCards } = await supabaseAdmin
    .from('credit_cards')
    .select('id, card_name, cutoff_day')
    .eq('is_active', true);

  const today = new Date();
  const { data: currentExpenses } = await supabaseAdmin
    .from('monthly_budget_expenses')
    .select('id, name, section, budgeted_amount, actual_spent, status')
    .eq('month', today.getMonth() + 1)
    .eq('year', today.getFullYear());

  // Si hay estado previo por clarificación, fusionar mensajes
  const messageToParse = prev
    ? `${prev.originalMessage}\n[clarificación adicional]: ${text}`
    : text;

  // Parsear con Claude
  let parsed;
  try {
    parsed = await parseExpenseMessage(messageToParse, {
      activeCards: activeCards || [],
      currentMonthExpenses: currentExpenses || [],
    });
  } catch (parseErr) {
    console.error('Error parsing with Claude:', parseErr);
    await sendMessage(chatId, '⚠️ No pude interpretar el mensaje. Intenta de nuevo.');
    return;
  }

  if (parsed.intent === 'unsupported') {
    await sendMessage(chatId, 'No entendí. Mándame algo como _"500 amex platinum en rappi"_.');
    return;
  }

  // Resolver card_id por nombre si no vino el UUID
  if (!parsed.card_id && parsed.card_name_guess) {
    const guess = parsed.card_name_guess.toLowerCase();
    const match = (activeCards || []).find(
      c => c.card_name.toLowerCase().includes(guess) || guess.includes(c.card_name.toLowerCase())
    );
    if (match) parsed.card_id = match.id;
  }

  // Si faltan datos, pedir clarificación
  if (parsed.needs_clarification.length > 0 || !parsed.card_id || !parsed.amount) {
    conversationState.set(chatId, { originalMessage: messageToParse, parsed });
    await sendMessage(chatId, parsed.clarification_question || '¿Puedes dar más detalles?');
    return;
  }

  // Calcular billing cycle
  const card = (activeCards || []).find(c => c.id === parsed.card_id);
  if (!card) {
    await sendMessage(chatId, 'No encontré la tarjeta indicada. Intenta de nuevo.');
    return;
  }

  const transactionDate = new Date();
  const cutoff = card.cutoff_day || 1;
  const { billingMonth, billingYear } = calculateBillingCycle(transactionDate, cutoff);
  const ambiguous = isInAmbiguousZone(transactionDate, cutoff);

  if (ambiguous) {
    const altMonth = billingMonth === 1 ? 12 : billingMonth - 1;
    const altYear = billingMonth === 1 ? billingYear - 1 : billingYear;
    conversationState.set(chatId, {
      ...parsed,
      transactionDate,
      billingMonth,
      billingYear,
      altMonth,
      altYear,
      card,
      awaitingBillingConfirmation: true,
    });
    await sendMessage(
      chatId,
      `Estás en zona ambigua del corte de *${card.card_name}*.\n` +
      `¿A qué ciclo va este gasto?\n` +
      `1️⃣ ${monthName(altMonth)} ${altYear} (ciclo anterior)\n` +
      `2️⃣ ${monthName(billingMonth)} ${billingYear} (siguiente ciclo)\n\n` +
      `Responde con _1_ o _2_.`
    );
    return;
  }

  await saveTransactionAndConfirm(chatId, parsed, card, transactionDate, billingMonth, billingYear);
}

async function handleBillingConfirmation(chatId, text, state) {
  const { billingMonth, billingYear, altMonth, altYear, card } = state;
  let chosenMonth, chosenYear;

  if (text.trim() === '1') {
    chosenMonth = altMonth;
    chosenYear = altYear;
  } else if (text.trim() === '2') {
    chosenMonth = billingMonth;
    chosenYear = billingYear;
  } else {
    await sendMessage(chatId, 'Responde con _1_ o _2_, por favor.');
    return;
  }

  conversationState.delete(chatId);
  await saveTransactionAndConfirm(chatId, state, card, state.transactionDate, chosenMonth, chosenYear);
}

async function saveTransactionAndConfirm(chatId, parsed, card, transactionDate, billingMonth, billingYear) {
  // Obtener user_id desde las tarjetas activas (todas pertenecen al mismo usuario)
  const { data: cardData } = await supabaseAdmin
    .from('credit_cards')
    .select('user_id')
    .eq('id', card.id)
    .single();

  const userId = cardData?.user_id;
  if (!userId) {
    await sendMessage(chatId, '⚠️ No se pudo determinar el usuario de la tarjeta.');
    return;
  }

  const merchantName = parsed.merchant || parsed.expense_hint || 'Sin nombre';

  // Buscar match con expense del budget
  const matchedExpense = await findMatchingExpense(merchantName, billingMonth, billingYear, userId);

  // Insertar transacción
  const { data: transaction, error } = await supabaseAdmin
    .from('card_transactions')
    .insert({
      user_id: userId,
      card_id: card.id,
      amount: parsed.amount,
      merchant: merchantName,
      transaction_date: transactionDate.toISOString().split('T')[0],
      billing_month: billingMonth,
      billing_year: billingYear,
      linked_expense_id: matchedExpense?.id || null,
      source: 'telegram',
    })
    .select()
    .single();

  if (error) {
    await sendMessage(chatId, `⚠️ Error guardando: ${error.message}`);
    return;
  }

  // Actualizar actual_spent del expense vinculado
  if (matchedExpense) {
    const newSpent = parseFloat(matchedExpense.actual_spent || 0) + parsed.amount;
    const newStatus = newSpent >= parseFloat(matchedExpense.budgeted_amount || 0) ? 'paid' : matchedExpense.status;
    await supabaseAdmin
      .from('monthly_budget_expenses')
      .update({ actual_spent: newSpent, status: newStatus })
      .eq('id', matchedExpense.id);
    await recordAliasUsage(merchantName, matchedExpense, userId);
  }

  conversationState.delete(chatId);

  // Mensaje de confirmación
  let msg = `✅ *$${parsed.amount}* en ${card.card_name}\n`;
  msg += `_${transaction.merchant}_\n`;
  if (matchedExpense) {
    msg += `🎯 Vinculado a *${matchedExpense.name}* (${matchedExpense.section})\n`;
  } else if (parsed.expense_hint) {
    msg += `⚠️ No encontré _"${parsed.expense_hint}"_ en tu budget. Quedó sin vincular.\n`;
  }
  msg += `📅 Ciclo: ${monthName(billingMonth)} ${billingYear}`;

  await sendMessage(chatId, msg);
}

function monthName(m) {
  return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
          'septiembre','octubre','noviembre','diciembre'][m - 1];
}
