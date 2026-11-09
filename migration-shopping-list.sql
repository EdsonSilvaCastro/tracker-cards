-- Migration: Shopping list (lista de compras agrupada por categoría)
-- Aplicar manualmente en el SQL editor de Supabase.

CREATE TABLE IF NOT EXISTS shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    budget DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    links TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON shopping_items(user_id);

CREATE TRIGGER update_shopping_items_updated_at
    BEFORE UPDATE ON shopping_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping items" ON shopping_items
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own shopping items" ON shopping_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shopping items" ON shopping_items
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own shopping items" ON shopping_items
    FOR DELETE USING (user_id = auth.uid());
