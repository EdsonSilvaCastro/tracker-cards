# Implementación: Quick Expense UI + Bot de Telegram

## Contexto

Continuación del refactor del Credit Card Tracker. Después del rediseño de Monthly Overview (ya completado), ahora vamos a implementar dos vías para registrar gastos individuales en tarjetas:

1. **Quick Expense UI**: un FAB flotante con modal para registro manual rápido desde la app web/móvil.
2. **Bot de Telegram**: registro por mensajes de lenguaje natural ("gasté 500 en amex en salidas del finde").

Ambas vías escriben a la misma tabla nueva `card_transactions` y comparten la misma lógica de matching con expenses del budget.

## Conceptos clave

### 1. Billing cycle por tarjeta

Cada tarjeta de crédito tiene un día de corte mensual. Una compra hecha **después del día de corte** pertenece al ciclo del **mes siguiente** (es decir, aparece en ese estado de cuenta y se paga en el mes posterior). Por lo tanto:

- Cada gasto tiene una `transaction_date` (cuándo ocurrió en el mundo real).
- Cada gasto tiene un `billing_month` y `billing_year` (a qué ciclo de tarjeta pertenece, calculado en función del `cutoff_day` de esa tarjeta).
- El presupuesto del mes se mide en **billing_month**, no en mes calendario de `transaction_date`.

**Fórmula de cálculo** (función `calculateBillingCycle(transactionDate, cutoffDay)`):
```
si transactionDate.día <= cutoffDay:
  billingMonth = transactionDate.mes
  billingYear = transactionDate.año
sino:
  billingMonth = transactionDate.mes + 1 (con rollover de año si llega a 13)
  billingYear = transactionDate.año (o +1 si rollover)
```

### 2. Zona ambigua post-corte (±3 días)

Los bancos a veces cortan 1-2 días después de la fecha teórica. Para protegerse de errores:

- Si `transactionDate.día` está entre `cutoffDay` y `cutoffDay + 3`, marcamos la transacción como **ambigua** y pedimos confirmación al usuario antes de guardarla.
- Fuera de ese rango, asignamos automáticamente sin preguntar.

**Función helper** (`isInAmbiguousZone(transactionDate, cutoffDay)`): retorna `true` si la fecha cae en `[cutoffDay, cutoffDay + 3]` (cíclicamente, considerando fin de mes).

### 3. Matching inteligente con expenses del budget

Cuando el usuario registra un gasto en un comercio (ej. "Rappi $450"), el sistema:

1. Busca si existe un alias guardado: `merchant_aliases` table maps `merchant_name → expense_id`.
2. Si existe: aplica automáticamente, asigna `paid_with` y marca el expense como `paid` si el monto cubre el budget.
3. Si no existe: pregunta al usuario si quiere asignarlo. Si confirma, guarda la regla en `merchant_aliases` para próximas veces.
4. El usuario siempre puede deshacer el match desde la UI.

### 4. Tarjetas activas

Solo las tarjetas con `is_active = true` aparecen en el FAB modal y son aceptadas por el bot. Esto permite "archivar" tarjetas canceladas sin perder historial.

---

## Fase 1 — Migración SQL

Crear archivo `migration-quick-expense.sql` en la raíz del repo. **No ejecutarlo, solo dejarlo listo.**

### Cambios a tabla `credit_cards`

```sql
ALTER TABLE credit_cards
  ADD COLUMN cutoff_day INTEGER CHECK (cutoff_day BETWEEN 1 AND 31),
  ADD COLUMN payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

### Poblar datos iniciales del usuario

```sql
-- Marcar Santander como inactiva (cancelada, conservar historial)
UPDATE credit_cards SET is_active = false
  WHERE LOWER(card_name) LIKE '%santander%';

-- Asignar fechas de corte conocidas (ajustar nombres si difieren)
UPDATE credit_cards SET cutoff_day = 11 WHERE LOWER(card_name) LIKE '%platinum%';
UPDATE credit_cards SET cutoff_day = 8  WHERE LOWER(card_name) LIKE '%gold%';
UPDATE credit_cards SET cutoff_day = 14 WHERE LOWER(card_name) LIKE '%nu%';
UPDATE credit_cards SET cutoff_day = 21 WHERE LOWER(card_name) LIKE '%costco%' OR LOWER(card_name) LIKE '%banamex%';
```

**IMPORTANTE**: Antes de escribir esto, leer la tabla actual con `SELECT id, card_name FROM credit_cards;` para confirmar los nombres exactos. Si difieren de lo asumido, ajustar el WHERE de cada UPDATE. Mostrarme los nombres reales antes de continuar.

### Nueva tabla `card_transactions`

```sql
CREATE TABLE card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  merchant TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  billing_month INTEGER NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
  billing_year INTEGER NOT NULL,
  linked_expense_id UUID REFERENCES monthly_budget_expenses(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'telegram', 'import')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_transactions_billing ON card_transactions(billing_year, billing_month);
CREATE INDEX idx_card_transactions_card ON card_transactions(card_id);
CREATE INDEX idx_card_transactions_merchant ON card_transactions(LOWER(merchant));
```

### Nueva tabla `merchant_aliases`

```sql
CREATE TABLE merchant_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_normalized TEXT NOT NULL,
  expense_template_id UUID REFERENCES monthly_budget_expenses(id) ON DELETE CASCADE,
  expense_name TEXT NOT NULL,
  expense_section TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_normalized)
);

CREATE INDEX idx_merchant_aliases_normalized ON merchant_aliases(merchant_normalized);
```

**Nota sobre `expense_template_id`**: este es un soft reference. Como cada mes se crean nuevos `monthly_budget_expenses`, el alias debe matchear por **nombre y sección**, no por UUID directo. El UUID se guarda como referencia inicial pero al aplicar el alias se busca el expense del mes en curso por `(name, section)`.

**Entregable de la Fase 1**:
1. Mostrar el SQL completo del archivo `migration-quick-expense.sql`.
2. Confirmar conmigo los nombres reales de las tarjetas en mi base de datos antes de los UPDATE.
3. **Detenerse** y esperar a que yo corra el SQL en Supabase manualmente.

---

## Fase 2 — Backend: Lógica de billing cycle + endpoints CRUD

### 2.1 Helper de billing cycle

Crear `credit-card-tracker/backend/utils/billingCycle.js`:

```js
function calculateBillingCycle(transactionDate, cutoffDay) {
  const date = new Date(transactionDate);
  const day = date.getDate();
  let month = date.getMonth() + 1; // 1-12
  let year = date.getFullYear();

  if (day > cutoffDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { billingMonth: month, billingYear: year };
}

function isInAmbiguousZone(transactionDate, cutoffDay, windowDays = 3) {
  const day = new Date(transactionDate).getDate();
  // Si día está entre cutoffDay y cutoffDay + windowDays
  if (day >= cutoffDay && day <= cutoffDay + windowDays) return true;
  // Manejo de wrap (ej. cutoff 30, día 1-2 del mes siguiente también es ambiguo)
  // Por ahora simplificamos: solo ventana hacia adelante. Si surge edge case, mejoramos.
  return false;
}

module.exports = { calculateBillingCycle, isInAmbiguousZone };
```

### 2.2 Controller `cardTransactionsController.js`

Crear `credit-card-tracker/backend/controllers/cardTransactionsController.js` con:

**`createTransaction(req, res)`**
- Body: `{ card_id, amount, merchant, transaction_date?, linked_expense_id?, source?, notes? }`
- `transaction_date` default = hoy.
- Buscar la tarjeta para obtener `cutoff_day`.
- Calcular `billing_month` y `billing_year`.
- Verificar `isInAmbiguousZone`. Si es ambigua y NO viene un campo `confirmed_billing_month` en el body, regresar 409 con la información para que el cliente pregunte:
  ```json
  {
    "ambiguous": true,
    "options": [
      { "billing_month": 4, "billing_year": 2026, "label": "Abril 2026 (ciclo actual de AMEX Gold)" },
      { "billing_month": 5, "billing_year": 2026, "label": "Mayo 2026 (siguiente ciclo)" }
    ],
    "suggested": { "billing_month": 5, "billing_year": 2026 }
  }
  ```
- Si no es ambigua O viene `confirmed_billing_month`/`confirmed_billing_year`, INSERT y regresar la transacción creada.
- Si viene `linked_expense_id`: actualizar `monthly_budget_expenses.actual_spent += amount` y si el spent llega o supera el budget, marcar `status = 'paid'`.
- También revisar `merchant_aliases` por si hay match automático (ver 2.3).

**`getTransactions(req, res)`**
- Query params: `card_id?`, `billing_month?`, `billing_year?`, `from?`, `to?`, `limit?` (default 50).
- Por defecto, regresar transacciones del mes en curso.
- Incluir join con `credit_cards` para nombre de tarjeta y con `monthly_budget_expenses` para nombre del expense vinculado.

**`updateTransaction(req, res)`**
- Permitir editar amount, merchant, transaction_date, linked_expense_id, notes.
- Si cambia `transaction_date`: recalcular billing_month/year.
- Si cambia `linked_expense_id`: ajustar `actual_spent` del expense viejo y nuevo.

**`deleteTransaction(req, res)`**
- Si tenía `linked_expense_id`: restar `amount` del `actual_spent` y si el expense estaba paid, revisarlo.
- Soft delete? No, hard delete por simplicidad. Confirmación va en frontend.

**`getMerchantAutocomplete(req, res)`**
- Query param: `q` (string).
- SELECT DISTINCT merchant, COUNT(*) as freq FROM card_transactions
  WHERE LOWER(merchant) LIKE LOWER(`%${q}%`)
  GROUP BY merchant ORDER BY freq DESC LIMIT 10.
- Si q es vacío, regresar los top 10 más frecuentes del usuario.

### 2.3 Helpers para alias matching

Crear `credit-card-tracker/backend/utils/merchantMatching.js`:

```js
function normalizeMerchant(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function findMatchingExpense(merchant, billingMonth, billingYear, supabase) {
  const normalized = normalizeMerchant(merchant);
  const { data: alias } = await supabase
    .from('merchant_aliases')
    .select('*')
    .eq('merchant_normalized', normalized)
    .single();

  if (!alias) return null;

  // Buscar el expense del mes en curso con mismo nombre y sección
  const { data: expense } = await supabase
    .from('monthly_budget_expenses')
    .select('*')
    .eq('month', billingMonth)
    .eq('year', billingYear)
    .eq('name', alias.expense_name)
    .eq('section', alias.expense_section)
    .single();

  return expense; // puede ser null si el expense no existe en el mes en curso
}

async function recordAliasUsage(merchant, expense, supabase) {
  const normalized = normalizeMerchant(merchant);
  // UPSERT
  await supabase.from('merchant_aliases').upsert({
    merchant_normalized: normalized,
    expense_template_id: expense.id,
    expense_name: expense.name,
    expense_section: expense.section,
    use_count: 1, // o incrementar si ya existía
    last_used_at: new Date().toISOString()
  }, { onConflict: 'merchant_normalized' });
}

module.exports = { normalizeMerchant, findMatchingExpense, recordAliasUsage };
```

### 2.4 Ajuste a `spending-analysis`

Modificar el endpoint creado en la fase anterior para que use `card_transactions` agrupados por `billing_month` y `billing_year`, no por `monthly_card_balances` ni por mes calendario. La nueva fuente de verdad para "cuánto se gastó" es la suma de `card_transactions` filtradas por billing cycle.

`monthly_card_balances` sigue existiendo para manejar el flag `is_paid` (cuándo pagaste la tarjeta), pero el `amount_to_pay` ahora se calcula on-the-fly desde `card_transactions`.

### 2.5 Rutas

En `credit-card-tracker/backend/routes/api.js` agregar:

```js
// Card Transactions
router.post('/transactions', cardTransactionsController.createTransaction);
router.get('/transactions', cardTransactionsController.getTransactions);
router.patch('/transactions/:id', cardTransactionsController.updateTransaction);
router.delete('/transactions/:id', cardTransactionsController.deleteTransaction);
router.get('/transactions/merchants/autocomplete', cardTransactionsController.getMerchantAutocomplete);
```

**Entregable de la Fase 2**: correr `npm run dev` en backend, verificar que arranca sin errores. Probar con curl al menos `POST /api/transactions` con datos de prueba. Mostrarme la salida.

---

## Fase 3 — Backend: Integración con Claude API + Telegram

### 3.1 Variables de entorno

Agregar a `credit-card-tracker/backend/.env.example` (y a `.env` real, pero sin commitear):

```
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_AUTHORIZED_CHAT_ID=...
```

### 3.2 Servicio Claude

Crear `credit-card-tracker/backend/services/claudeService.js`:

```js
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseExpenseMessage(userMessage, context) {
  // context = { activeCards: [...], currentMonthExpenses: [...] }
  const systemPrompt = buildSystemPrompt(context);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  // El modelo regresa JSON. Parsearlo y validarlo.
  const text = response.content[0].text.trim();
  // Tolerar respuestas envueltas en ```json```
  const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
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
Respuesta: {"intent":"register_expense","amount":300,"card_id":null,"card_name_guess":null,"merchant":"Uber","expense_hint":"uber","needs_clarification":["card"],"clarification_question":"¿Con qué tarjeta? (AMEX Platinum, AMEX Gold, Nu, Banamex Costco)"}

Usuario: "hola"
Respuesta: {"intent":"unsupported","amount":null,"card_id":null,"card_name_guess":null,"merchant":null,"expense_hint":null,"needs_clarification":[],"clarification_question":null}
`;
}

module.exports = { parseExpenseMessage };
```

**Nota**: instalar `@anthropic-ai/sdk` con `npm install @anthropic-ai/sdk` dentro de `backend/`. Esto es una dependencia nueva, **avísame antes de instalarla** confirmando que está bien (sí lo está).

### 3.3 Servicio Telegram

Crear `credit-card-tracker/backend/services/telegramService.js`:

```js
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...options
    })
  });
  return res.json();
}

function isAuthorized(chatId) {
  return String(chatId) === String(process.env.TELEGRAM_AUTHORIZED_CHAT_ID);
}

module.exports = { sendMessage, isAuthorized };
```

### 3.4 Endpoint webhook

Crear `credit-card-tracker/backend/controllers/telegramController.js`:

```js
const { parseExpenseMessage } = require('../services/claudeService');
const { sendMessage, isAuthorized } = require('../services/telegramService');
const { calculateBillingCycle, isInAmbiguousZone } = require('../utils/billingCycle');
const { findMatchingExpense, recordAliasUsage } = require('../utils/merchantMatching');
const supabase = require('../db/supabase'); // ajustar import al patrón existente

// Estado conversacional simple en memoria. Para algo más robusto usar Redis o tabla.
const conversationState = new Map();

async function handleWebhook(req, res) {
  // Telegram envía: { message: { chat: { id }, text, ... }, ... }
  const update = req.body;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  if (!chatId || !text) return res.sendStatus(200);

  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, 'No autorizado.');
    return res.sendStatus(200);
  }

  try {
    await processMessage(chatId, text);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    await sendMessage(chatId, '⚠️ Error al procesar tu mensaje. Intenta de nuevo.');
  }

  res.sendStatus(200);
}

async function processMessage(chatId, text) {
  // 1. Comandos básicos
  if (text === '/start' || text === '/help') {
    await sendMessage(chatId, 'Mándame un gasto en lenguaje natural, ej:\n_"500 amex platinum en salidas finde"_');
    return;
  }

  if (text === '/cancel') {
    conversationState.delete(chatId);
    await sendMessage(chatId, 'Cancelado.');
    return;
  }

  // 2. Recuperar estado previo si existe (para multi-turn)
  const prev = conversationState.get(chatId);

  // 3. Cargar contexto: tarjetas activas y expenses del mes en curso
  const { data: activeCards } = await supabase
    .from('credit_cards')
    .select('id, card_name, cutoff_day')
    .eq('is_active', true);

  const today = new Date();
  const { data: currentExpenses } = await supabase
    .from('monthly_budget_expenses')
    .select('id, name, section, budgeted_amount, actual_spent, status')
    .eq('month', today.getMonth() + 1)
    .eq('year', today.getFullYear());

  // 4. Si estábamos esperando una clarificación, fusionar con el estado previo
  let messageToParse = text;
  if (prev) {
    messageToParse = `${prev.originalMessage}\n[clarificación adicional]: ${text}`;
  }

  // 5. Parsear con Claude
  const parsed = await parseExpenseMessage(messageToParse, { activeCards, currentMonthExpenses: currentExpenses });

  if (parsed.intent === 'unsupported') {
    await sendMessage(chatId, 'No entendí. Mándame algo como _"500 amex en uber"_.');
    return;
  }

  // 6. Resolver card_id si vino solo el nombre
  if (!parsed.card_id && parsed.card_name_guess) {
    const guess = parsed.card_name_guess.toLowerCase();
    const match = activeCards.find(c => c.card_name.toLowerCase().includes(guess) || guess.includes(c.card_name.toLowerCase()));
    if (match) parsed.card_id = match.id;
  }

  // 7. Si todavía falta info, pedir clarificación
  if (parsed.needs_clarification.length > 0 || !parsed.card_id || !parsed.amount) {
    conversationState.set(chatId, { originalMessage: messageToParse, parsed });
    await sendMessage(chatId, parsed.clarification_question || '¿Puedes especificar más?');
    return;
  }

  // 8. Calcular billing cycle
  const card = activeCards.find(c => c.id === parsed.card_id);
  const transactionDate = new Date();
  const { billingMonth, billingYear } = calculateBillingCycle(transactionDate, card.cutoff_day);
  const ambiguous = isInAmbiguousZone(transactionDate, card.cutoff_day);

  if (ambiguous) {
    // Pedir confirmación de billing cycle
    conversationState.set(chatId, { ...parsed, transactionDate, awaitingBillingConfirmation: true });
    const altMonth = billingMonth === 1 ? 12 : billingMonth - 1;
    const altYear = billingMonth === 1 ? billingYear - 1 : billingYear;
    await sendMessage(chatId,
      `Estás en zona ambigua del corte de *${card.card_name}*.\n` +
      `¿A qué ciclo va este gasto?\n` +
      `1️⃣ Ciclo de ${monthName(billingMonth)} ${billingYear}\n` +
      `2️⃣ Ciclo de ${monthName(altMonth)} ${altYear}\n\n` +
      `Responde con _1_ o _2_.`
    );
    return;
  }

  // 9. Buscar match con expense del budget
  const matchedExpense = await findMatchingExpense(
    parsed.merchant || parsed.expense_hint || '',
    billingMonth,
    billingYear,
    supabase
  );

  // 10. Insertar la transacción
  const { data: transaction, error } = await supabase
    .from('card_transactions')
    .insert({
      card_id: parsed.card_id,
      amount: parsed.amount,
      merchant: parsed.merchant || parsed.expense_hint || 'Sin nombre',
      transaction_date: transactionDate.toISOString().split('T')[0],
      billing_month: billingMonth,
      billing_year: billingYear,
      linked_expense_id: matchedExpense?.id || null,
      source: 'telegram'
    })
    .select()
    .single();

  if (error) {
    await sendMessage(chatId, `⚠️ Error guardando: ${error.message}`);
    return;
  }

  // 11. Si se vinculó a un expense, actualizar actual_spent
  if (matchedExpense) {
    const newSpent = (matchedExpense.actual_spent || 0) + parsed.amount;
    const newStatus = newSpent >= matchedExpense.budgeted_amount ? 'paid' : matchedExpense.status;
    await supabase
      .from('monthly_budget_expenses')
      .update({ actual_spent: newSpent, status: newStatus })
      .eq('id', matchedExpense.id);
    await recordAliasUsage(parsed.merchant || parsed.expense_hint, matchedExpense, supabase);
  }

  // 12. Limpiar estado y confirmar
  conversationState.delete(chatId);

  let confirmationMsg = `✅ *$${parsed.amount}* en ${card.card_name}\n`;
  confirmationMsg += `_${transaction.merchant}_\n`;
  if (matchedExpense) {
    confirmationMsg += `🎯 Vinculado a *${matchedExpense.name}* (${matchedExpense.section})\n`;
  } else if (parsed.expense_hint) {
    confirmationMsg += `⚠️ No encontré "${parsed.expense_hint}" en tu budget. Quedó sin vincular.\n`;
  }
  confirmationMsg += `📅 Ciclo: ${monthName(billingMonth)} ${billingYear}`;

  await sendMessage(chatId, confirmationMsg);
}

function monthName(m) {
  return ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][m-1];
}

module.exports = { handleWebhook };
```

### 3.5 Ruta del webhook

En `routes/api.js`:

```js
router.post('/telegram/webhook', telegramController.handleWebhook);
```

**Entregable de la Fase 3**:
1. Confirmar que `npm install @anthropic-ai/sdk` se hizo bien.
2. Servidor backend arranca sin errores.
3. Mostrarme la URL exacta del endpoint webhook (ej. `https://tu-dominio.com/api/telegram/webhook`) que necesitaré para configurar en Telegram.

---

## Fase 4 — Frontend: Quick Expense UI

### 4.1 FAB global

Modificar `credit-card-tracker/frontend/src/components/Layout.jsx` (o el equivalente que envuelve todas las páginas).

Agregar un FAB fijo abajo a la derecha:

```jsx
<button
  onClick={() => setQuickExpenseOpen(true)}
  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-zinc-900 text-white shadow-lg hover:bg-zinc-800 flex items-center justify-center z-40"
  aria-label="Registrar gasto rápido"
>
  <PlusIcon className="w-6 h-6" />
</button>

{quickExpenseOpen && (
  <QuickExpenseModal onClose={() => setQuickExpenseOpen(false)} />
)}
```

Manejar `quickExpenseOpen` con `useState`. El FAB es visible en TODAS las páginas (Dashboard, Monthly, Cards, etc.).

### 4.2 Componente `QuickExpenseModal`

Crear `credit-card-tracker/frontend/src/components/QuickExpenseModal.jsx`. Estructura visual basada en el mockup `/mnt/user-data/outputs/quick_expense_mockup.html` (referencia conceptual; adaptarse al patrón Tailwind del proyecto).

**Estado interno**:
```js
const [amount, setAmount] = useState('');
const [selectedCard, setSelectedCard] = useState(null);
const [merchant, setMerchant] = useState('');
const [merchantSuggestions, setMerchantSuggestions] = useState([]);
const [matchedExpense, setMatchedExpense] = useState(null);
const [confirmedMatch, setConfirmedMatch] = useState(false);
const [billingConflict, setBillingConflict] = useState(null); // { options, suggested } si el backend regresa 409
const [saving, setSaving] = useState(false);
```

**Layout**:
1. **Header**: "Registrar gasto" + botón cerrar (X)
2. **Amount input** grande (font 36px, centrado, fondo gris claro). Foco automático al abrir.
3. **Tarjetas como segmented buttons** (4 botones uno al lado del otro). Se cargan de `GET /api/cards?active=true`.
4. **Merchant input** con autocomplete:
   - Llamar a `/api/transactions/merchants/autocomplete?q=${merchant}` con debounce de 300ms.
   - Mostrar chips clickeables debajo del input.
5. **Match suggestion** (cuando aparece): card azul que dice "Este gasto coincide con _'X'_ en _'Y'_. ¿Asignar?" con botones No/Sí.
6. **Botones inferiores**: "Guardar y otro" + "Guardar".
7. **Hints de teclado** abajo: Enter, Cmd+Enter, Esc.

**Flujo**:
- Al cambiar `merchant` (con debounce): query autocomplete + checar si hay alias guardado mostrando `matchedExpense`.
- Al hacer Submit:
  - POST a `/api/transactions` con `{ card_id, amount, merchant, linked_expense_id: confirmedMatch ? matchedExpense.id : null, source: 'manual' }`.
  - Si recibe 409 (billing ambiguo): mostrar dialog "Este gasto entra al ciclo de _X_ o _Y_?". El usuario elige y reenviar con `confirmed_billing_month` y `confirmed_billing_year`.
  - Si éxito: mostrar toast "Guardado", cerrar modal (o si fue "Guardar y otro", solo limpiar fields manteniendo la tarjeta seleccionada).

**Atajos de teclado**:
- `Enter`: submit normal
- `Cmd+Enter` / `Ctrl+Enter`: "Guardar y otro"
- `Esc`: cerrar

**Aviso de billing cycle**:
Si después de calcular se ve que el `billing_month` no es el mes actual (por estar después de la fecha de corte), mostrar un pill discreto debajo del card selector: _"📅 Este gasto entra al ciclo de mayo 2026"_.

### 4.3 Cliente API

Extender `credit-card-tracker/frontend/src/lib/api.js`:

```js
// Card transactions
transactions: {
  create: (data) => fetch('/api/transactions', { method: 'POST', body: JSON.stringify(data), headers: ... }).then(r => r.json()),
  list: (params) => fetch(`/api/transactions?${new URLSearchParams(params)}`).then(r => r.json()),
  update: (id, data) => fetch(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: ... }).then(r => r.json()),
  delete: (id) => fetch(`/api/transactions/${id}`, { method: 'DELETE' }).then(r => r.json()),
  merchantAutocomplete: (q) => fetch(`/api/transactions/merchants/autocomplete?q=${encodeURIComponent(q)}`).then(r => r.json()),
}
```

Adaptar al patrón existente del archivo.

### 4.4 Refresco de Monthly Overview

Cuando se guarda una transacción, los stats del Monthly Overview deben refrescarse. Si tienes context/store global, dispatch un evento. Si no, simplemente forzar refetch al cerrar el modal (puedes usar un callback prop o un event bus simple).

**Entregable de la Fase 4**:
1. Frontend compila sin errores ni warnings.
2. FAB visible en todas las páginas.
3. Modal abre, se puede registrar un gasto manualmente, aparece en Monthly Overview.

---

## Fase 5 — Setup de Telegram + Anthropic API (instrucciones para el usuario)

Esto NO es código, es una guía para que yo (Ed) configure las credenciales. Crear un archivo `SETUP_TELEGRAM.md` en la raíz del repo con estos pasos:

### Anthropic API
1. Ir a [console.anthropic.com](https://console.anthropic.com), iniciar sesión.
2. Crear un workspace si es la primera vez.
3. Cargar saldo prepagado (mínimo $5 USD).
4. **Configurar límite mensual de gasto**: en Billing → Spending limits → poner $5 USD/mes para protección.
5. Generar API key en API Keys → Create Key. Copiar el `sk-ant-...`.
6. Pegar en `.env`: `ANTHROPIC_API_KEY=sk-ant-...`.

### Telegram Bot
1. Abrir Telegram, buscar @BotFather, iniciar chat.
2. `/newbot`, seguir prompts para nombre y username.
3. Copiar el token que regresa. Pegar en `.env`: `TELEGRAM_BOT_TOKEN=...`.
4. Conseguir tu `chat_id`:
   - Mandarle un mensaje al bot recién creado (cualquier texto).
   - Abrir en navegador: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Buscar `"chat":{"id": ...}` en la respuesta. Ese número es tu chat_id.
   - Pegar en `.env`: `TELEGRAM_AUTHORIZED_CHAT_ID=...`.
5. Configurar el webhook (apuntar Telegram a tu backend):
   ```
   curl -F "url=https://TU_DOMINIO/api/telegram/webhook" \
        https://api.telegram.org/bot<TOKEN>/setWebhook
   ```
6. Reiniciar el backend con las nuevas env vars.

---

## Fase 6 — Testing manual end-to-end

### Test 1: Quick Expense UI
1. Abrir la app.
2. Click en FAB.
3. Registrar: $450, AMEX Platinum, "Rappi".
4. Verificar que aparece en Monthly Overview, en gastos de la tarjeta.

### Test 2: Match con expense
1. Crear (si no existe) un expense "Delivery" en Life Style con budget $1000.
2. Quick Expense: $300, AMEX Platinum, "Rappi" → al confirmar el match con "Delivery", verificar que el expense suma 300 al `actual_spent` y queda registrado el alias.
3. Repetir Quick Expense: $200, AMEX Platinum, "Rappi" → debería sugerir Delivery automáticamente.

### Test 3: Billing cycle
1. (Simulación si no estás en zona ambigua hoy) Modificar temporalmente el `cutoff_day` de una tarjeta para que coincida con la fecha actual ±2 días.
2. Registrar gasto. Verificar que pide confirmación del ciclo.
3. Restaurar `cutoff_day` original.

### Test 4: Bot Telegram
1. Mandar al bot: "300 amex platinum rappi"
2. Verificar respuesta de confirmación con monto, tarjeta, merchant, match si aplica, y billing cycle.
3. Verificar que el gasto aparece en la app web al refrescar.

### Test 5: Bot con info incompleta
1. Mandar: "200 en uber"
2. Verificar que pregunta por la tarjeta.
3. Responder "amex platinum"
4. Verificar que registra correctamente.

---

## Reglas durante la implementación

1. **Detenerse al final de cada fase** y mostrar progreso.
2. **No introducir dependencias adicionales** además de `@anthropic-ai/sdk` (ya autorizada).
3. **No tocar otras páginas** salvo `Layout.jsx` para el FAB.
4. **Usar el patrón de estilo existente** (Tailwind, hooks, controllers/services del backend).
5. **Si encuentras ambigüedad, preguntar antes de asumir.**
6. **No commitear `.env` ni el `TELEGRAM_BOT_TOKEN` ni la `ANTHROPIC_API_KEY`** en ningún archivo.
7. Comentarios en código: breves y solo donde aporten contexto no obvio.

Empieza por la **Fase 1**.
