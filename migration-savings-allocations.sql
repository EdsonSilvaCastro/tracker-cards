-- Monthly savings allocations: links a savings goal to a monthly budget
-- Applied manually in Supabase SQL Editor

CREATE TABLE monthly_savings_allocations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             INTEGER NOT NULL,
  savings_goal_id  UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  contribution_id  UUID REFERENCES savings_contributions(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year, savings_goal_id)
);
