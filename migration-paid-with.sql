-- Migration: Add paid_with field to monthly_budget_expenses
-- This field tracks which credit card (or cash) was used to pay each expense,
-- enabling "in-plan vs out-of-plan" spending analysis.
--
-- Values:
--   - UUID of a credit_cards.id  → paid with that specific card
--   - 'cash'                     → paid with cash
--   - NULL                       → unassigned (not yet linked)
--
-- No FK constraint is added because values can be a UUID *or* the string 'cash'.

ALTER TABLE monthly_budget_expenses
  ADD COLUMN IF NOT EXISTS paid_with TEXT DEFAULT NULL;
