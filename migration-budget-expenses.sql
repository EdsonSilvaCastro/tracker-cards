-- Migration: Add monthly budget expenses table
-- This creates a budget tracking system with 4 sections

-- Create the monthly_budget_expenses table
CREATE TABLE IF NOT EXISTS monthly_budget_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('living_expenses', 'life_style', 'monthly_payments', 'general_expenses')),
    expense_name TEXT NOT NULL,
    budgeted_amount DECIMAL(12, 2) DEFAULT 0,
    actual_spent DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year, section, expense_name)
);

-- Create monthly budget totals table (optional - for storing total budget per month)
CREATE TABLE IF NOT EXISTS monthly_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    total_budget DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_budget_expenses_user ON monthly_budget_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budget_expenses_period ON monthly_budget_expenses(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_budget_expenses_section ON monthly_budget_expenses(section);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user ON monthly_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_period ON monthly_budgets(year, month);

-- Trigger for updated_at on expenses
CREATE TRIGGER update_monthly_budget_expenses_updated_at 
    BEFORE UPDATE ON monthly_budget_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on budgets
CREATE TRIGGER update_monthly_budgets_updated_at 
    BEFORE UPDATE ON monthly_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE monthly_budget_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_budget_expenses
CREATE POLICY "Users can view their own budget expenses" ON monthly_budget_expenses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own budget expenses" ON monthly_budget_expenses
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budget expenses" ON monthly_budget_expenses
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budget expenses" ON monthly_budget_expenses
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for monthly_budgets
CREATE POLICY "Users can view their own budgets" ON monthly_budgets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own budgets" ON monthly_budgets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budgets" ON monthly_budgets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budgets" ON monthly_budgets
    FOR DELETE USING (user_id = auth.uid());
