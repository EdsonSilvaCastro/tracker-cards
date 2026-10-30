import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../config/supabase.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-5-5';
const MAX_TOOL_TURNS = 6;

const tools = [
  {
    name: 'get_budget_summary',
    description: 'Obtiene el presupuesto mensual del usuario: total presupuestado y el detalle de gastos por sección (living_expenses, life_style, monthly_payments, general_expenses) con monto presupuestado, gastado y status.',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'integer', description: 'Mes, 1-12' },
        year: { type: 'integer', description: 'Año, ej. 2026' },
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'get_card_transactions',
    description: 'Obtiene las transacciones de tarjeta del usuario (card_transactions) para un mes de facturación dado: monto, comercio, tarjeta, fecha y, en las mensualidades, su estado (installment_status: paid, pending o cancelled).',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'integer', description: 'Mes de facturación, 1-12' },
        year: { type: 'integer', description: 'Año de facturación' },
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'get_card_balances',
    description: 'Obtiene las tarjetas activas del usuario con sus saldos reales de un mes: saldo total (current_balance), monto a pagar del mes (amount_to_pay) y si ya se pagó (is_paid), además del límite de crédito y % de utilización.',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'integer', description: 'Mes, 1-12' },
        year: { type: 'integer', description: 'Año, ej. 2026' },
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'get_spending_trends',
    description: 'Obtiene la tendencia de gasto de los últimos N meses: total pagado en tarjetas y total de gastos del presupuesto por mes, agrupado por sección.',
    input_schema: {
      type: 'object',
      properties: {
        months: { type: 'integer', description: 'Cuántos meses hacia atrás incluir, default 6' },
      },
      required: [],
    },
  },
];

async function getBudgetSummary(userId, month, year) {
  const [budgetResult, expensesResult] = await Promise.all([
    supabaseAdmin
      .from('monthly_budgets')
      .select('total_budget')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle(),
    supabaseAdmin
      .from('monthly_budget_expenses')
      .select('section, expense_name, budgeted_amount, actual_spent, status')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),
  ]);

  return {
    total_budget: budgetResult.data?.total_budget || 0,
    expenses: expensesResult.data || [],
  };
}

async function getCardTransactions(userId, month, year) {
  const { data, error } = await supabaseAdmin
    .from('card_transactions')
    .select('amount, merchant, transaction_date, notes, installment_status, credit_cards(card_name)')
    .eq('user_id', userId)
    .eq('billing_month', month)
    .eq('billing_year', year)
    .order('transaction_date');

  if (error) throw error;
  return data || [];
}

async function getCardBalances(userId, month, year) {
  const { data: cards, error } = await supabaseAdmin
    .from('credit_cards')
    .select('id, card_name, bank, credit_limit')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;

  const cardIds = (cards || []).map(c => c.id);
  const { data: balances, error: balancesError } = await supabaseAdmin
    .from('monthly_card_balances')
    .select('card_id, current_balance, amount_to_pay, is_paid, paid_date')
    .in('card_id', cardIds.length ? cardIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('month', month)
    .eq('year', year);

  if (balancesError) throw balancesError;

  const byCard = Object.fromEntries((balances || []).map(b => [b.card_id, b]));

  return (cards || []).map(({ id, ...card }) => {
    const balance = byCard[id];
    const currentBalance = Number(balance?.current_balance || 0);
    return {
      ...card,
      month,
      year,
      current_balance: currentBalance,
      amount_to_pay: Number(balance?.amount_to_pay || 0),
      is_paid: balance?.is_paid ?? false,
      paid_date: balance?.paid_date ?? null,
      utilization_percentage: card.credit_limit > 0
        ? Number(((currentBalance / card.credit_limit) * 100).toFixed(1))
        : 0,
    };
  });
}

async function getSpendingTrends(userId, months) {
  const { data: userCards } = await supabaseAdmin
    .from('credit_cards')
    .select('id')
    .eq('user_id', userId);
  const cardIds = (userCards || []).map(c => c.id);

  const now = new Date();
  const trends = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const [cardsResult, expensesResult] = await Promise.all([
      supabaseAdmin
        .from('monthly_card_balances')
        .select('amount_to_pay')
        .in('card_id', cardIds.length ? cardIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('month', month)
        .eq('year', year),
      supabaseAdmin
        .from('monthly_budget_expenses')
        .select('actual_spent, section')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year),
    ]);

    const cards = cardsResult.data || [];
    const expenses = expensesResult.data || [];

    const bySection = {};
    expenses.forEach(exp => {
      bySection[exp.section] = (bySection[exp.section] || 0) + parseFloat(exp.actual_spent || 0);
    });

    trends.push({
      month,
      year,
      label: `${month}/${year}`,
      total_card_payments: cards.reduce((sum, c) => sum + parseFloat(c.amount_to_pay || 0), 0),
      total_expenses: expenses.reduce((sum, e) => sum + parseFloat(e.actual_spent || 0), 0),
      by_section: bySection,
    });
  }

  return trends;
}

async function executeTool(name, input, userId) {
  switch (name) {
    case 'get_budget_summary':
      return getBudgetSummary(userId, input.month, input.year);
    case 'get_card_transactions':
      return getCardTransactions(userId, input.month, input.year);
    case 'get_card_balances':
      return getCardBalances(userId, input.month, input.year);
    case 'get_spending_trends':
      return getSpendingTrends(userId, input.months || 6);
    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

function buildSystemPrompt() {
  const now = new Date();
  return `Eres un asistente financiero que analiza la información de tarjetas de crédito y presupuesto del usuario.

Fecha actual: ${now.toISOString().slice(0, 10)} (mes ${now.getMonth() + 1}, año ${now.getFullYear()}).

Usa las herramientas disponibles para consultar los datos reales del usuario antes de responder — nunca inventes cifras. Si la pregunta es ambigua sobre el periodo (ej. "este mes"), usa el mes/año actual. Responde en español, de forma clara y concisa, con montos en formato MXN (ej. $1,234.50) e incluye los números concretos que respaldan tu análisis. Responde en texto plano, sin markdown: nada de asteriscos, almohadillas ni tablas; para listas usa líneas que empiecen con un guion.`;
}

export async function analyzeFinances(userId, question, history = []) {
  const system = buildSystemPrompt();
  const messages = [...history, { role: 'user', content: question }];

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system,
      tools,
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock ? textBlock.text.trim() : '';
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      try {
        const result = await executeTool(block.name, block.input, userId);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: ${error.message}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('Se alcanzó el máximo de iteraciones sin obtener una respuesta final');
}
