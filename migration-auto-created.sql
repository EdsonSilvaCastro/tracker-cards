-- Agregar campo auto_created a monthly_budget_expenses
-- Permite distinguir expenses creados manualmente vs auto-creados por el sistema
-- (bot de Telegram o Quick Expense cuando no hay match en el budget)

ALTER TABLE monthly_budget_expenses
  ADD COLUMN auto_created BOOLEAN NOT NULL DEFAULT false;

-- Índice parcial para consultas rápidas de expenses auto-creados por mes/año
CREATE INDEX idx_expenses_auto_created
  ON monthly_budget_expenses(month, year, auto_created)
  WHERE auto_created = true;
