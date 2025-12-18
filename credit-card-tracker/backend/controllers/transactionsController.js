import { supabaseAdmin } from '../config/supabase.js';

// Get all transactions with optional filters
export const getAllTransactions = async (req, res) => {
  try {
    const { card_id, start_date, end_date, category, transaction_type } = req.query;

    let query = supabaseAdmin
      .from('transactions')
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

    if (card_id) query = query.eq('card_id', card_id);
    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);
    if (category) query = query.eq('category', category);
    if (transaction_type) query = query.eq('transaction_type', transaction_type);

    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('transactions')
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
        error: 'Transaction not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new transaction
export const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;

    // Verify card belongs to user
    const { data: card } = await supabaseAdmin
      .from('credit_cards')
      .select('id, current_balance')
      .eq('id', transactionData.card_id)
      .eq('user_id', req.userId)
      .single();

    if (!card) {
      return res.status(403).json({ 
        success: false, 
        error: 'Card not found or access denied' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;

    // Update card balance if it's a purchase
    if (transactionData.transaction_type === 'Purchase' || !transactionData.transaction_type) {
      const newBalance = card.current_balance + transactionData.amount;
      await supabaseAdmin
        .from('credit_cards')
        .update({ current_balance: newBalance })
        .eq('id', transactionData.card_id);
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify transaction belongs to user's card
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select(`
        card_id,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Get transaction details first
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        credit_cards!inner (
          id,
          current_balance,
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    // Delete transaction
    const { error } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Restore card balance if it was a purchase
    if (transaction.transaction_type === 'Purchase' || !transaction.transaction_type) {
      const newBalance = transaction.credit_cards.current_balance - transaction.amount;
      await supabaseAdmin
        .from('credit_cards')
        .update({ current_balance: newBalance })
        .eq('id', transaction.card_id);
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get transaction statistics
export const getTransactionStats = async (req, res) => {
  try {
    const { card_id, start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('transactions')
      .select(`
        amount,
        transaction_date,
        category,
        transaction_type,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('credit_cards.user_id', req.userId);

    if (card_id) query = query.eq('card_id', card_id);
    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);

    const { data, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats = {
      total_transactions: data.length,
      total_amount: data.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      purchases: data.filter(t => t.transaction_type === 'Purchase').length,
      total_purchases: data
        .filter(t => t.transaction_type === 'Purchase')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      refunds: data.filter(t => t.transaction_type === 'Refund').length,
      total_refunds: data
        .filter(t => t.transaction_type === 'Refund')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    };

    // Category breakdown
    const categoryBreakdown = data.reduce((acc, t) => {
      if (t.category) {
        if (!acc[t.category]) {
          acc[t.category] = { count: 0, total: 0 };
        }
        acc[t.category].count++;
        acc[t.category].total += parseFloat(t.amount);
      }
      return acc;
    }, {});

    stats.by_category = categoryBreakdown;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};
