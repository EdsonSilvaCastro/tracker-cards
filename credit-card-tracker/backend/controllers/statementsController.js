import { supabaseAdmin } from '../config/supabase.js';

// Get all statements with optional filters
export const getAllStatements = async (req, res) => {
  try {
    const { month, year, status, card_id } = req.query;

    let query = supabaseAdmin
      .from('monthly_statements')
      .select(`
        *,
        credit_cards!inner (
          id,
          card_name,
          bank,
          user_id
        )
      `)
      .eq('credit_cards.user_id', req.userId);

    if (month) query = query.eq('statement_month', month);
    if (year) query = query.eq('statement_year', parseInt(year));
    if (status) query = query.eq('status', status);
    if (card_id) query = query.eq('card_id', card_id);

    query = query.order('payment_due_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching statements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get statement by ID
export const getStatementById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('monthly_statements')
      .select(`
        *,
        credit_cards!inner (
          id,
          card_name,
          bank,
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Statement not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching statement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new statement
export const createStatement = async (req, res) => {
  try {
    const statementData = req.body;

    // Verify card belongs to user
    const { data: card } = await supabaseAdmin
      .from('credit_cards')
      .select('id')
      .eq('id', statementData.card_id)
      .eq('user_id', req.userId)
      .single();

    if (!card) {
      return res.status(403).json({ 
        success: false, 
        error: 'Card not found or access denied' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_statements')
      .insert([statementData])
      .select()
      .single();

    if (error) throw error;

    // Update card balance
    await supabaseAdmin
      .from('credit_cards')
      .update({ current_balance: statementData.total_balance })
      .eq('id', statementData.card_id);

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating statement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update statement
export const updateStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify statement belongs to user's card
    const { data: statement } = await supabaseAdmin
      .from('monthly_statements')
      .select(`
        card_id,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!statement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Statement not found' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_statements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating statement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete statement
export const deleteStatement = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify statement belongs to user's card
    const { data: statement } = await supabaseAdmin
      .from('monthly_statements')
      .select(`
        card_id,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!statement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Statement not found' 
      });
    }

    const { error } = await supabaseAdmin
      .from('monthly_statements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Statement deleted successfully' });
  } catch (error) {
    console.error('Error deleting statement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark statement as paid
export const markStatementPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount_paid, payment_date } = req.body;

    // Verify statement belongs to user's card
    const { data: statement } = await supabaseAdmin
      .from('monthly_statements')
      .select(`
        *,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!statement) {
      return res.status(404).json({ 
        success: false, 
        error: 'Statement not found' 
      });
    }

    const paidAmount = amount_paid || statement.total_balance;
    const status = paidAmount >= statement.total_balance ? 'PAID' : 'PARTIAL';

    const { data, error } = await supabaseAdmin
      .from('monthly_statements')
      .update({
        status,
        paid_amount: paidAmount,
        paid_date: payment_date || new Date().toISOString().split('T')[0]
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error marking statement as paid:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAllStatements,
  getStatementById,
  createStatement,
  updateStatement,
  deleteStatement,
  markStatementPaid
};
