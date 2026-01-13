-- Migration: Add savings goals table
-- This creates a savings tracking system for financial goals

-- Create the savings_goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    target_date DATE,
    category TEXT DEFAULT 'general' CHECK (category IN ('emergency', 'vacation', 'house', 'car', 'education', 'retirement', 'other', 'general')),
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'piggy-bank',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, goal_name)
);

-- Create savings contributions table to track deposits/withdrawals
CREATE TABLE IF NOT EXISTS savings_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    contribution_type TEXT DEFAULT 'deposit' CHECK (contribution_type IN ('deposit', 'withdrawal')),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON savings_goals(status);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_user ON savings_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_date ON savings_contributions(contribution_date);

-- Trigger for updated_at on savings_goals
CREATE TRIGGER update_savings_goals_updated_at 
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for savings_goals
CREATE POLICY "Users can view their own savings goals" ON savings_goals
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own savings goals" ON savings_goals
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for savings_contributions
CREATE POLICY "Users can view their own contributions" ON savings_contributions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own contributions" ON savings_contributions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own contributions" ON savings_contributions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own contributions" ON savings_contributions
    FOR DELETE USING (user_id = auth.uid());
