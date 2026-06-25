import { parseExpenseMessage } from '../services/claudeService.js';
import { sendMessage, isAuthorized } from '../services/telegramService.js';
import { calculateBillingCycle, isInAmbiguousZone } from '../utils/billingCycle.js';
import { findMatchingExpense, recordAliasUsage } from '../utils/merchantMatching.js';
import { autoCreateExpenseAndLink } from '../utils/autoCreateExpense.js';
import { supabaseAdmin } from '../config/supabase.js';

// Estado conversacional en memoria (simple, para uso personal de un solo usuario)
const conversationState = new Map();

// user_id dueño del bot — acota las consultas a sus propias tarjetas/expenses.
// Sin esto, supabaseAdmin (service role) traería tarjetas de TODOS los usuarios y el
// bot podría empatar/guardar contra una tarjeta ajena.
const OWNER_USER_ID = process.env.TELEGRAM_OWNER_USER_ID;

// ---------------------------------------------------------------------------
// GET /api/telegram/status  — Diagnóstico del estado del bot
// ---------------------------------------------------------------------------
export async function getBotStatus(req, res) {
  const results = {};

  // Verificar token de Telegram
  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`
    );
    const tgJson = await tgRes.json();
    results.telegram = tgJson.ok
      ? { ok: true, bot_username: tgJson.result?.username }
      : { ok: false, error: tgJson.description };
  } catch (e) {
    results.telegram = { ok: false, error: e.message };
  }

  // Verificar webhook registrado
  try {
    const whRes = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const whJson = await whRes.json();
    results.webhook = whJson.ok
      ? {
          ok: true,
          url: whJson.result?.url,
          pending_update_count: whJson.result?.pending_update_count,
          last_error_message: whJson.result?.last_error_message,
          last_error_date: whJson.result?.last_error_date,
        }
      : { ok: false, error: whJson.description };
  } catch (e) {
    results.webhook = { ok: false, error: e.message };
  }

  // Verificar Anthropic API (prueba con una llamada mínima)
  try {
    await parseExpenseMessage('test diagnóstico', { activeCards: [] });
    results.claude = { ok: true };
  } catch (e) {
    results.claude = { ok: false, error: e.message };
  }

  // Verificar Supabase (ping simple)
  try {
    const { error } = await supabaseAdmin
      .from('credit_cards')
      .select('id')
      .limit(1);
    results.supabase = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    results.supabase = { ok: false, error: e.message };
  }

  const allOk = Object.values(results).every(r => r.ok);
  res.status(allOk ? 200 : 207).json({ status: allOk ? 'all_ok' : 'degraded', checks: results });
}

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook  — Telegram llama aquí en cada mensaje
// ---------------------------------------------------------------------------
export async function handleWebhook(req, res) {
  const update = req.body;
  const updateId = update?.update_id;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  // Responder 200 INMEDIATAMENTE — Telegram no debe esperar la lógica
  res.sendStatus(200);

  if (!updateId || !chatId || !text) return;

  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, 'No autorizado.');
    return;
  }

  try {
    // Idempotencia: verificar si ya procesamos este update_id
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('processed_telegram_updates')
      .select('update_id')
      .eq('update_id', updateId)
      .maybeSingle();

    if (selectError) {
      console.error('Error leyendo processed_telegram_updates:', selectError);
      // Continuar: no bloquear por fallo de idempotencia
    }

    if (existing) {
      console.log(`Skipping duplicate update_id ${updateId}`);
      return;
    }

    // Marcar como procesado ANTES de procesar (evita race conditions)
    const { error: insertError } = await supabaseAdmin
      .from('processed_telegram_updates')
      .insert({ update_id: updateId, chat_id: chatId, message_text: text });

    if (insertError) {
      // Unique constraint violation: otra invocación ya ganó la carrera
      if (insertError.code === '23505') {
        console.log(`Race condition: update_id ${updateId} ya procesado por otra request`);
        return;
      }
      console.error('Error registrando update_id:', insertError);
      // Continuar de todas formas — mejor procesar que perder el mensaje
    }

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
      'Mándame un gasto en lenguaje natural, ej:\n<i>"500 amex platinum en salidas finde"</i>\n\n/cancel para cancelar una operación en curso.'
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

  // Cargar tarjetas activas y expenses del mes en curso (acotado al dueño del bot)
  let cardsQuery = supabaseAdmin
    .from('credit_cards')
    .select('id, card_name, cutoff_day')
    .eq('is_active', true);
  if (OWNER_USER_ID) cardsQuery = cardsQuery.eq('user_id', OWNER_USER_ID);
  const { data: activeCards } = await cardsQuery;

  const today = new Date();
  let expensesQuery = supabaseAdmin
    .from('monthly_budget_expenses')
    .select('id, expense_name, section, budgeted_amount, actual_spent, status')
    .eq('month', today.getMonth() + 1)
    .eq('year', today.getFullYear());
  if (OWNER_USER_ID) expensesQuery = expensesQuery.eq('user_id', OWNER_USER_ID);
  const { data: currentExpenses } = await expensesQuery;

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
    await sendMessage(chatId, 'No entendí. Mándame algo como <i>"500 amex platinum en rappi"</i>.');
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
      `Estás en zona ambigua del corte de <b>${card.card_name.trim()}</b>.\n` +
      `¿A qué ciclo va este gasto?\n` +
      `1️⃣ ${monthName(altMonth)} ${altYear} (ciclo anterior)\n` +
      `2️⃣ ${monthName(billingMonth)} ${billingYear} (siguiente ciclo)\n\n` +
      `Responde con <i>1</i> o <i>2</i>.`
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
    await sendMessage(chatId, 'Responde con <i>1</i> o <i>2</i>, por favor.');
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
  let linkedExpense = await findMatchingExpense(merchantName, billingMonth, billingYear, userId);
  let wasAutoCreated = false;

  // Sin match — auto-crear expense en General expenses (bot siempre auto-crea)
  if (!linkedExpense) {
    try {
      linkedExpense = await autoCreateExpenseAndLink({
        merchant: merchantName,
        amount: parsed.amount,
        cardId: card.id,
        billingMonth,
        billingYear,
        userId,
      });
      wasAutoCreated = true;
    } catch (err) {
      console.error('Auto-create expense failed in telegram flow:', err);
      await sendMessage(chatId,
        `⚠️ No pude registrar tu gasto.\n` +
        `Error al crear el expense automáticamente: ${err.message}\n` +
        `Intenta de nuevo o avísame si persiste.`
      );
      conversationState.delete(chatId);
      return; // abortar: NO insertar la card_transaction huérfana
    }
  }

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
      linked_expense_id: linkedExpense?.id || null,
      source: 'telegram',
    })
    .select()
    .single();

  if (error) {
    await sendMessage(chatId, `⚠️ Error guardando: ${error.message}`);
    return;
  }

  // Actualizar actual_spent del expense vinculado
  // (si fue auto-creado, actual_spent ya se insertó con el monto correcto; no sumar de nuevo)
  if (linkedExpense && !wasAutoCreated) {
    const newSpent = parseFloat(linkedExpense.actual_spent || 0) + parsed.amount;
    const newStatus = newSpent >= parseFloat(linkedExpense.budgeted_amount || 0) ? 'paid' : linkedExpense.status;
    await supabaseAdmin
      .from('monthly_budget_expenses')
      .update({ actual_spent: newSpent, status: newStatus })
      .eq('id', linkedExpense.id);
    await recordAliasUsage(merchantName, linkedExpense, userId);
  }

  conversationState.delete(chatId);

  // Mensaje de confirmación
  let msg = `✅ <b>$${parsed.amount}</b> en ${card.card_name.trim()}\n`;
  msg += `<i>${transaction.merchant}</i>\n`;
  if (wasAutoCreated) {
    msg += `🆕 Creé <b>${linkedExpense.expense_name}</b> en General expenses\n`;
  } else if (linkedExpense) {
    msg += `🎯 Vinculado a <b>${linkedExpense.expense_name}</b> (${linkedExpense.section})\n`;
  }
  msg += `📅 Ciclo: ${monthName(billingMonth)} ${billingYear}`;

  await sendMessage(chatId, msg);
}

function monthName(m) {
  return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
          'septiembre','octubre','noviembre','diciembre'][m - 1];
}
