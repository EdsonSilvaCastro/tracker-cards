import { supabaseAdmin } from '../config/supabase.js';

const toRow = (b) => {
  const category = String(b.category ?? '').trim();
  const name = String(b.name ?? '').trim();
  if (!category) return { error: 'category is required' };
  if (!name) return { error: 'name is required' };

  const price = b.price === '' || b.price == null ? 0 : Number(b.price);
  const budget = b.budget === '' || b.budget == null ? 0 : Number(b.budget);
  if (!Number.isFinite(price) || price < 0) return { error: 'price must be a number >= 0' };
  if (!Number.isFinite(budget) || budget < 0) return { error: 'budget must be a number >= 0' };

  const links = (Array.isArray(b.links) ? b.links : [])
    .map((l) => String(l).trim())
    .filter(Boolean);

  return { row: { category, name, price, budget, notes: String(b.notes ?? '').trim() || null, links } };
};

export const getItems = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('shopping_items')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching shopping items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const { row, error: invalid } = toRow(req.body);
    if (invalid) return res.status(400).json({ success: false, error: invalid });

    const { data, error } = await supabaseAdmin
      .from('shopping_items')
      .insert({ ...row, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating shopping item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { row, error: invalid } = toRow(req.body);
    if (invalid) return res.status(400).json({ success: false, error: invalid });

    const { data, error } = await supabaseAdmin
      .from('shopping_items')
      .update(row)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating shopping item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('shopping_items')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
