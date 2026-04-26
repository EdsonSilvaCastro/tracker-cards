-- =============================================================================
-- MIGRATION: Quick Expense + Card Transactions
-- =============================================================================
-- INSTRUCCIONES:
-- 1. Antes de correr los UPDATE de cutoff_day, ejecuta:
--      SELECT id, card_name FROM credit_cards;
--    para confirmar los nombres exactos y ajustar los WHERE si es necesario.
-- 2. Correr en Supabase SQL Editor (o psql) en orden de arriba a abajo.
-- 3. NO modificar tablas existentes hasta confirmar los nombres de tarjetas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Paso 1: Agregar columnas a credit_cards
-- -----------------------------------------------------------------------------
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS cutoff_day       INTEGER CHECK (cutoff_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS payment_due_day  INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT true;


-- -----------------------------------------------------------------------------
-- Paso 2: Marcar tarjetas inactivas y asignar días de corte
-- (⚠️ Confirmar nombres reales con SELECT id, card_name FROM credit_cards; primero)
-- -----------------------------------------------------------------------------

-- Santander: cancelada, mantener historial
UPDATE credit_cards
  SET is_active = false
  WHERE LOWER(card_name) LIKE '%santander%';

-- Días de corte por tarjeta
UPDATE credit_cards SET cutoff_day = 11 WHERE LOWER(card_name) LIKE '%platinum%';
UPDATE credit_cards SET cutoff_day = 8  WHERE LOWER(card_name) LIKE '%gold%';
UPDATE credit_cards SET cutoff_day = 14 WHERE LOWER(card_name) LIKE '%nu%';
UPDATE credit_cards SET cutoff_day = 21
  WHERE LOWER(card_name) LIKE '%costco%'
     OR LOWER(card_name) LIKE '%banamex%';


-- -----------------------------------------------------------------------------
-- Paso 3: Nueva tabla card_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id           UUID        NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  merchant          TEXT        NOT NULL,
  transaction_date  DATE        NOT NULL,
  billing_month     INTEGER     NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
  billing_year      INTEGER     NOT NULL,
  linked_expense_id UUID        REFERENCES monthly_budget_expenses(id) ON DELETE SET NULL,
  source            TEXT        NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('manual', 'telegram', 'import')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_transactions_billing
  ON card_transactions(billing_year, billing_month);

CREATE INDEX IF NOT EXISTS idx_card_transactions_card
  ON card_transactions(card_id);

CREATE INDEX IF NOT EXISTS idx_card_transactions_user
  ON card_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_card_transactions_merchant
  ON card_transactions(LOWER(merchant));

-- RLS
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own card_transactions"
  ON card_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- Paso 4: Nueva tabla merchant_aliases
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchant_aliases (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_normalized   TEXT        NOT NULL,
  expense_template_id   UUID        REFERENCES monthly_budget_expenses(id) ON DELETE CASCADE,
  expense_name          TEXT        NOT NULL,
  expense_section       TEXT        NOT NULL,
  use_count             INTEGER     NOT NULL DEFAULT 1,
  last_used_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_normalized)
);

CREATE INDEX IF NOT EXISTS idx_merchant_aliases_normalized
  ON merchant_aliases(user_id, merchant_normalized);

-- RLS
ALTER TABLE merchant_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own merchant_aliases"
  ON merchant_aliases
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- Paso 5: Trigger para actualizar updated_at en card_transactions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_card_transactions ON card_transactions;
CREATE TRIGGER set_updated_at_card_transactions
  BEFORE UPDATE ON card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
