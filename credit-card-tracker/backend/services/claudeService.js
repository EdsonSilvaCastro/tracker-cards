import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function parseExpenseMessage(userMessage, context) {
  const systemPrompt = buildSystemPrompt(context);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text.trim();
  // Tolerar respuestas envueltas en ```json```
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

function buildSystemPrompt(context) {
  const cardList = context.activeCards
    .map(c => `- ${c.card_name} (id: ${c.id})`)
    .join('\n');

  return `Eres un asistente que extrae información de gastos en español mexicano.

El usuario tiene estas tarjetas activas:
${cardList}

El usuario te enviará mensajes informales sobre gastos. Tu tarea es responder ÚNICAMENTE con JSON válido (sin texto adicional, sin backticks).

Esquema de respuesta:
{
  "intent": "register_expense" | "ask_clarification" | "unsupported",
  "amount": number | null,
  "card_id": uuid | null,
  "card_name_guess": string | null,
  "merchant": string | null,
  "expense_hint": string | null,
  "needs_clarification": ["amount" | "card" | "merchant"] | [],
  "clarification_question": string | null
}

Reglas:
- Si falta amount o card, llena needs_clarification y formula clarification_question en español natural.
- "amex" sin más detalle es ambiguo entre AMEX Platinum y AMEX Gold: pedir aclaración.
- expense_hint puede ser una pista del nombre del expense del budget (ej. "salidas finde", "delivery", "uber", etc.).
- merchant es opcional, puede deducirse del expense_hint si no se menciona.
- Si el mensaje no es sobre un gasto, intent = "unsupported".

Ejemplos:
Usuario: "gasté 500 con amex platinum en salidas del finde"
Respuesta: {"intent":"register_expense","amount":500,"card_id":null,"card_name_guess":"AMEX Platinum","merchant":null,"expense_hint":"salidas finde","needs_clarification":[],"clarification_question":null}

Usuario: "300 en uber"
Respuesta: {"intent":"register_expense","amount":300,"card_id":null,"card_name_guess":null,"merchant":"Uber","expense_hint":"uber","needs_clarification":["card"],"clarification_question":"¿Con qué tarjeta? (${context.activeCards.map(c => c.card_name).join(', ')})"}

Usuario: "hola"
Respuesta: {"intent":"unsupported","amount":null,"card_id":null,"card_name_guess":null,"merchant":null,"expense_hint":null,"needs_clarification":[],"clarification_question":null}
`;
}
