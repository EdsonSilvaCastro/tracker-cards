-- Credit Card Tracker Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Credit Cards Table
CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_name TEXT NOT NULL,
    bank TEXT NOT NULL,
    card_type TEXT DEFAULT 'Credit' CHECK (card_type IN ('Credit', 'Debit', 'Loan')),
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    current_balance DECIMAL(12, 2) DEFAULT 0,
    available_credit DECIMAL(12, 2) DEFAULT 0,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    annual_fee DECIMAL(10, 2) DEFAULT 0,
    closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
    payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
    minimum_payment_percentage DECIMAL(5, 2) DEFAULT 5.0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Closed')),
    card_number_last4 TEXT,
    rewards_program TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, card_name, bank)
);

-- Monthly Statements Table
CREATE TABLE monthly_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    statement_month TEXT NOT NULL,
    statement_year INTEGER NOT NULL,
    previous_balance DECIMAL(12, 2) DEFAULT 0,
    purchases DECIMAL(12, 2) DEFAULT 0,
    payments DECIMAL(12, 2) DEFAULT 0,
    interest_charges DECIMAL(12, 2) DEFAULT 0,
    fees DECIMAL(12, 2) DEFAULT 0,
    total_balance DECIMAL(12, 2) NOT NULL,
    minimum_payment DECIMAL(12, 2) NOT NULL,
    payment_due_date DATE NOT NULL,
    status TEXT DEFAULT 'NOT PAID' CHECK (status IN ('PAID', 'NOT PAID', 'PARTIAL', 'OPEN')),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, statement_month, statement_year)
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_type TEXT DEFAULT 'Purchase' CHECK (transaction_type IN ('Purchase', 'Payment', 'Refund', 'Fee', 'Interest')),
    installments INTEGER DEFAULT 1,
    current_installment INTEGER DEFAULT 1,
    merchant TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment History Table
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    statement_id UUID REFERENCES monthly_statements(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    late_payment BOOLEAN DEFAULT FALSE,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Utilization History Table
CREATE TABLE utilization_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    balance DECIMAL(12, 2) NOT NULL,
    credit_limit DECIMAL(12, 2) NOT NULL,
    utilization_percentage DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, record_date)
);

-- Indexes for better query performance
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_monthly_statements_card_id ON monthly_statements(card_id);
CREATE INDEX idx_monthly_statements_status ON monthly_statements(status);
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_payment_history_card_id ON payment_history(card_id);
CREATE INDEX idx_payment_history_date ON payment_history(payment_date);
CREATE INDEX idx_utilization_history_card_id ON utilization_history(card_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_statements_updated_at BEFORE UPDATE ON monthly_statements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate available credit
CREATE OR REPLACE FUNCTION update_available_credit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.available_credit := NEW.credit_limit - NEW.current_balance;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate available credit
CREATE TRIGGER calculate_available_credit BEFORE INSERT OR UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_available_credit();

-- Function to record utilization history when balance changes
CREATE OR REPLACE FUNCTION record_utilization()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_balance IS DISTINCT FROM OLD.current_balance OR 
       NEW.credit_limit IS DISTINCT FROM OLD.credit_limit THEN
        INSERT INTO utilization_history (card_id, record_date, balance, credit_limit, utilization_percentage)
        VALUES (
            NEW.id,
            CURRENT_DATE,
            NEW.current_balance,
            NEW.credit_limit,
            CASE 
                WHEN NEW.credit_limit > 0 THEN (NEW.current_balance / NEW.credit_limit * 100)
                ELSE 0
            END
        )
        ON CONFLICT (card_id, record_date) 
        DO UPDATE SET 
            balance = EXCLUDED.balance,
            credit_limit = EXCLUDED.credit_limit,
            utilization_percentage = EXCLUDED.utilization_percentage;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to record utilization on balance changes
CREATE TRIGGER track_utilization AFTER INSERT OR UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION record_utilization();

-- Row Level Security (RLS) Policies
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilization_history ENABLE ROW LEVEL SECURITY;

-- Policies for credit_cards
CREATE POLICY "Users can view their own cards" 
    ON credit_cards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards" 
    ON credit_cards FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" 
    ON credit_cards FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" 
    ON credit_cards FOR DELETE 
    USING (auth.uid() = user_id);

-- Policies for monthly_statements
CREATE POLICY "Users can view statements of their cards" 
    ON monthly_statements FOR SELECT 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert statements for their cards" 
    ON monthly_statements FOR INSERT 
    WITH CHECK (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update statements of their cards" 
    ON monthly_statements FOR UPDATE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete statements of their cards" 
    ON monthly_statements FOR DELETE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- Policies for transactions
CREATE POLICY "Users can view transactions of their cards" 
    ON transactions FOR SELECT 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert transactions for their cards" 
    ON transactions FOR INSERT 
    WITH CHECK (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update transactions of their cards" 
    ON transactions FOR UPDATE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete transactions of their cards" 
    ON transactions FOR DELETE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- Policies for payment_history
CREATE POLICY "Users can view payment history of their cards" 
    ON payment_history FOR SELECT 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment history for their cards" 
    ON payment_history FOR INSERT 
    WITH CHECK (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment history of their cards" 
    ON payment_history FOR UPDATE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment history of their cards" 
    ON payment_history FOR DELETE 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- Policies for utilization_history
CREATE POLICY "Users can view utilization history of their cards" 
    ON utilization_history FOR SELECT 
    USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- Views for common queries
CREATE OR REPLACE VIEW card_summary AS
SELECT 
    cc.id,
    cc.user_id,
    cc.card_name,
    cc.bank,
    cc.card_type,
    cc.credit_limit,
    cc.current_balance,
    cc.available_credit,
    cc.status,
    CASE 
        WHEN cc.credit_limit > 0 THEN (cc.current_balance / cc.credit_limit * 100)
        ELSE 0
    END as utilization_percentage,
    COUNT(DISTINCT ms.id) as total_statements,
    COUNT(DISTINCT CASE WHEN ms.status = 'NOT PAID' THEN ms.id END) as unpaid_statements,
    COALESCE(SUM(CASE WHEN ms.status = 'NOT PAID' THEN ms.total_balance END), 0) as total_unpaid_balance,
    COALESCE(SUM(CASE WHEN ms.status = 'NOT PAID' THEN ms.minimum_payment END), 0) as total_minimum_payment
FROM credit_cards cc
LEFT JOIN monthly_statements ms ON cc.id = ms.card_id
GROUP BY cc.id;

-- Grant access to view
GRANT SELECT ON card_summary TO authenticated;

-- Function to get summary report
CREATE OR REPLACE FUNCTION get_user_summary(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_cards', COUNT(*),
        'total_credit_limit', COALESCE(SUM(credit_limit), 0),
        'total_balance', COALESCE(SUM(current_balance), 0),
        'total_available', COALESCE(SUM(available_credit), 0),
        'overall_utilization', 
            CASE 
                WHEN SUM(credit_limit) > 0 THEN (SUM(current_balance) / SUM(credit_limit) * 100)
                ELSE 0
            END,
        'total_unpaid_statements', COALESCE(SUM(unpaid_statements), 0),
        'total_amount_due', COALESCE(SUM(total_unpaid_balance), 0),
        'total_minimum_payment', COALESCE(SUM(total_minimum_payment), 0)
    ) INTO result
    FROM card_summary
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data insertion (Your December data)
-- Replace 'YOUR_USER_ID' with your actual Supabase user ID after authentication
-- You can get it from: SELECT auth.uid();

-- Example:
-- INSERT INTO credit_cards (user_id, card_name, bank, credit_limit, current_balance, status)
-- VALUES 
--     (auth.uid(), 'AMEX', 'American Express', 100161.00, 33387.00, 'Active'),
--     (auth.uid(), 'AMEX GOLD', 'American Express', 71958.00, 23986.00, 'Active'),
--     (auth.uid(), 'BANAMEX', 'Banamex', 3300.00, 1100.00, 'Active'),
--     (auth.uid(), 'SANTANDER', 'Santander', 2400.00, 800.00, 'Active'),
--     (auth.uid(), 'NU', 'Nu Bank', 19305.00, 6435.00, 'Active'),
--     (auth.uid(), 'BANAMEX LOAN', 'Banamex', 6987.00, 2329.00, 'Active');
