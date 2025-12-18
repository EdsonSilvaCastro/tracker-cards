-- Migration: Add monthly_card_balances table
-- This separates card static info from monthly balance data

-- Create the monthly_card_balances table
CREATE TABLE IF NOT EXISTS monthly_card_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    current_balance DECIMAL(12, 2) DEFAULT 0,    -- Total balance on the card
    amount_to_pay DECIMAL(12, 2) DEFAULT 0,      -- Amount you need to pay this month ("Me")
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, month, year)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_card_balances_card_id ON monthly_card_balances(card_id);
CREATE INDEX IF NOT EXISTS idx_monthly_card_balances_period ON monthly_card_balances(year, month);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_card_balances_updated_at 
    BEFORE UPDATE ON monthly_card_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE monthly_card_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to credit_cards)
CREATE POLICY "Users can view their own monthly balances" ON monthly_card_balances
    FOR SELECT USING (
        card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own monthly balances" ON monthly_card_balances
    FOR INSERT WITH CHECK (
        card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own monthly balances" ON monthly_card_balances
    FOR UPDATE USING (
        card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own monthly balances" ON monthly_card_balances
    FOR DELETE USING (
        card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
    );

-- Optional: Remove current_balance from credit_cards if you want
-- ALTER TABLE credit_cards DROP COLUMN current_balance;
-- ALTER TABLE credit_cards DROP COLUMN available_credit;
