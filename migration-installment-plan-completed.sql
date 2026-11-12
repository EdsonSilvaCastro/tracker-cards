-- Plans whose installments are all settled become 'completed'.
-- The app now maintains this automatically (see syncPlanStatuses); this backfills existing rows.

-- Allow 'completed' if installment_plans.status is guarded by a CHECK constraint.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'installment_plans'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE installment_plans DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE installment_plans
    ADD CONSTRAINT installment_plans_status_check CHECK (status IN ('active', 'completed', 'cancelled'));
END $$;

UPDATE installment_plans p
SET status = 'completed', updated_at = NOW()
WHERE p.status = 'active'
  AND EXISTS (SELECT 1 FROM card_transactions t WHERE t.installment_plan_id = p.id AND t.installment_status = 'paid')
  AND NOT EXISTS (SELECT 1 FROM card_transactions t WHERE t.installment_plan_id = p.id AND t.installment_status = 'pending');
