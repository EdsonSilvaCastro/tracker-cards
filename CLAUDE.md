# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (Express API — port 3001)
cd credit-card-tracker/backend && npm run dev    # nodemon, auto-restarts on change
cd credit-card-tracker/backend && npm start      # production start

# Frontend (Vite dev server — port 5173)
cd credit-card-tracker/frontend && npm run dev
cd credit-card-tracker/frontend && npm run build
cd credit-card-tracker/frontend && npm run lint  # ESLint; backend has no linter/tests
```

No test suite exists for either package.

## Architecture

### Directory layout

```
credit-card-tracker/
  backend/          Express + Supabase API
  frontend/         React 18 + Vite + Tailwind 4
supabase-schema.sql   baseline schema
migration-*.sql       incremental migrations (applied manually in Supabase SQL editor)
```

### Backend (`credit-card-tracker/backend/`)

Single-file entry: `server.js` mounts all routes under `/api` from `routes/api.js`. The project uses ESM (`"type": "module"`).

**Request lifecycle:** `routes/api.js` → `middleware/auth.js` → controller → (optionally) service

- `middleware/auth.js`: validates Supabase Bearer JWT, attaches `req.user` / `req.userId`
- `controllers/`: one file per resource; each function is a route handler
- `services/claudeService.js`: calls `claude-haiku-4-5-20251001` to parse natural-language expense messages from Telegram
- `services/telegramService.js`: Telegram bot webhook handler
- `config/supabase.js`: exports two clients — `supabase` (anon key, respects RLS) and `supabaseAdmin` (service role, bypasses RLS)

The Telegram webhook endpoint (`POST /api/telegram/webhook`) is intentionally placed **before** the `authenticateUser` middleware in `routes/api.js`.

**Environment variables** (see `.env.example`):
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
PORT (default 3001)
ALLOWED_ORIGINS
ANTHROPIC_API_KEY
TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_CHAT_ID
```

### Frontend (`credit-card-tracker/frontend/`)

React Router v6 with a `<Layout>` shell wrapping all protected routes. Default route redirects to `/monthly`.

**Auth:** `contexts/AuthContext.jsx` wraps Supabase auth; `lib/api.js` creates an axios instance that reads the Supabase session and injects `Authorization: Bearer <token>` on every request. 401 responses trigger sign-out + redirect to `/login`.

**API layer:** `lib/api.js` exports named objects (`cardsApi`, `budgetApi`, `installmentPlansApi`, `cardTransactionsApi`, etc.) — import these rather than calling axios directly.

**Pages and their purpose:**

| Route | Page | Notes |
|---|---|---|
| `/monthly` | `MonthlyOverview` | Primary view; budget by section + card balances |
| `/due-dates` | `PaymentDueDates` | Upcoming card payment deadlines |
| `/compare` | `MonthlyComparison` | Month-over-month spending comparison |
| `/savings` | `SavingsGoals` | Savings goal tracking |
| `/annual` | `AnnualSummary` | Year-level analytics |
| `/monthly-payments` | `MonthlyPayments` | Installment plan management |
| `/cards` | `Cards` | Card CRUD |

`MonthlyOverview` is split into sub-components under `pages/monthly/`: `MonthlyHero`, `MonthlyStats`, `CardsGrid`, `CategoryAccordion`, and modals under `pages/monthly/modals/`.

**Design system:** Neobrutalist. Reusable primitives live in `components/retroui/` (Button, Card, Badge, Dialog, Input, Table, Text, Alert). Use these before reaching for raw HTML or Tailwind one-offs.

**Currency:** always formatted as MXN using `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`. UI copy is in English.

**Budget sections** (fixed enum used throughout backend and frontend):
`living_expenses` · `life_style` · `monthly_payments` · `general_expenses`

### Database (Supabase)

Core tables: `credit_cards`, `monthly_statements`, `transactions`, `payment_history`, and tables added by migrations (`monthly_balances`, `budget_*`, `savings_goals`, `installment_plans`, `card_transactions`).

All tables use `user_id UUID REFERENCES auth.users(id)` for row-level ownership. When adding new tables, follow this pattern and add an RLS policy. Schema changes go in a new `migration-<feature>.sql` file at the repo root and are applied manually.
