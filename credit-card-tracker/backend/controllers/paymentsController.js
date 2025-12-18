import { supabaseAdmin } from '../config/supabase.js';

// Get all payments with optional filters
export const getAllPayments = async (req, res) => {
  try {
    const { card_id, start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('payment_history')
      .select(`
        *,
        credit_cards!inner (
          id,
          card_name,
          bank,
          user_id
        ),
        monthly_statements (
          id,
          statement_month,
          statement_year
        )
      `)
      .eq('credit_cards.user_id', req.userId);

    if (card_id) query = query.eq('card_id', card_id);
    if (start_date) query = query.gte('payment_date', start_date);
    if (end_date) query = query.lte('payment_date', end_date);

    query = query.order('payment_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('payment_history')
      .select(`
        *,
        credit_cards!inner (
          id,
          card_name,
          bank,
          user_id
        ),
        monthly_statements (
          id,
          statement_month,
          statement_year
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  try {
    const paymentData = req.body;

    // Verify card belongs to user
    const { data: card } = await supabaseAdmin
      .from('credit_cards')
      .select('id, current_balance')
      .eq('id', paymentData.card_id)
      .eq('user_id', req.userId)
      .single();

    if (!card) {
      return res.status(403).json({ 
        success: false, 
        error: 'Card not found or access denied' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('payment_history')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

    // Update card balance
    const newBalance = card.current_balance - paymentData.amount_paid;
    await supabaseAdmin
      .from('credit_cards')
      .update({ current_balance: newBalance })
      .eq('id', paymentData.card_id);

    // Update statement if linked
    if (paymentData.statement_id) {
      const { data: statement } = await supabaseAdmin
        .from('monthly_statements')
        .select('total_balance, paid_amount')
        .eq('id', paymentData.statement_id)
        .single();

      if (statement) {
        const totalPaid = (statement.paid_amount || 0) + paymentData.amount_paid;
        const status = totalPaid >= statement.total_balance ? 'PAID' : 'PARTIAL';

        await supabaseAdmin
          .from('monthly_statements')
          .update({
            status,
            paid_amount: totalPaid,
            paid_date: paymentData.payment_date
          })
          .eq('id', paymentData.statement_id);
      }
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify payment belongs to user's card
    const { data: payment } = await supabaseAdmin
      .from('payment_history')
      .select(`
        card_id,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('credit_cards.user_id', req.userId)
      .single();

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('payment_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    // Get payment details first
    const { data: payment } = await supabaseAdmin
      .from('payment_history')
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

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    // Delete payment
    const { error } = await supabaseAdmin
      .from('payment_history')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Restore card balance
    const newBalance = payment.credit_cards.current_balance + payment.amount_paid;
    await supabaseAdmin
      .from('credit_cards')
      .update({ current_balance: newBalance })
      .eq('id', payment.card_id);

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('payment_history')
      .select(`
        amount_paid,
        payment_date,
        late_payment,
        credit_cards!inner (
          user_id
        )
      `)
      .eq('credit_cards.user_id', req.userId);

    if (start_date) query = query.gte('payment_date', start_date);
    if (end_date) query = query.lte('payment_date', end_date);

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total_payments: data.length,
      total_amount_paid: data.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0),
      late_payments: data.filter(p => p.late_payment).length,
      average_payment: data.length > 0 
        ? data.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) / data.length 
        : 0
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats
};
