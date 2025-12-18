import { supabaseAdmin } from '../config/supabase.js';

// Get all monthly balances (optionally filtered by month/year)
const getMonthlyBalances = async (req, res) => {
  try {
    const { month, year, card_id } = req.query;
    
    let query = supabaseAdmin
      .from('monthly_card_balances')
      .select(`
        *,
        credit_cards (
          id,
          card_name,
          bank,
          card_type,
          credit_limit,
          closing_day,
          payment_due_day,
          status,
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by user's cards
    query = query.eq('credit_cards.user_id', req.user.id);

    if (month) query = query.eq('month', parseInt(month));
    if (year) query = query.eq('year', parseInt(year));
    if (card_id) query = query.eq('card_id', card_id);

    const { data, error } = await query;

    if (error) throw error;

    // Filter out entries where credit_cards is null (not belonging to user)
    const filteredData = data.filter(item => item.credit_cards !== null);

    res.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Error fetching monthly balances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get monthly balances for a specific month/year with all user's cards
const getMonthlyOverview = async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // First get all user's cards
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('credit_cards')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'Active')
      .order('card_name');

    if (cardsError) throw cardsError;

    // Get existing monthly balances for this period
    const cardIds = cards.map(c => c.id);
    const { data: balances, error: balancesError } = await supabaseAdmin
      .from('monthly_card_balances')
      .select('*')
      .in('card_id', cardIds)
      .eq('month', monthNum)
      .eq('year', yearNum);

    if (balancesError) throw balancesError;

    // Merge cards with their monthly balances
    const overview = cards.map(card => {
      const balance = balances.find(b => b.card_id === card.id);
      return {
        card_id: card.id,
        card_name: card.card_name,
        bank: card.bank,
        card_type: card.card_type,
        credit_limit: card.credit_limit,
        closing_day: card.closing_day,
        payment_due_day: card.payment_due_day,
        // Monthly balance data (or defaults)
        balance_id: balance?.id || null,
        current_balance: balance?.current_balance ?? 0,
        amount_to_pay: balance?.amount_to_pay ?? 0,
        is_paid: balance?.is_paid ?? false,
        paid_date: balance?.paid_date || null,
        notes: balance?.notes || null,
        has_balance_entry: !!balance
      };
    });

    // Calculate totals
    const totals = {
      total_balance: overview.reduce((sum, c) => sum + parseFloat(c.current_balance || 0), 0),
      total_to_pay: overview.reduce((sum, c) => sum + parseFloat(c.amount_to_pay || 0), 0),
      paid_count: overview.filter(c => c.is_paid).length,
      total_count: overview.length
    };

    res.json({ 
      success: true, 
      data: {
        month: monthNum,
        year: yearNum,
        cards: overview,
        totals
      }
    });
  } catch (error) {
    console.error('Error fetching monthly overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create or update monthly balance for a card
const upsertMonthlyBalance = async (req, res) => {
  try {
    const { card_id, month, year, current_balance, amount_to_pay, is_paid, notes } = req.body;

    // Verify the card belongs to the user
    const { data: card, error: cardError } = await supabaseAdmin
      .from('credit_cards')
      .select('id')
      .eq('id', card_id)
      .eq('user_id', req.user.id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Upsert the monthly balance
    const { data, error } = await supabaseAdmin
      .from('monthly_card_balances')
      .upsert({
        card_id,
        month: parseInt(month),
        year: parseInt(year),
        current_balance: parseFloat(current_balance) || 0,
        amount_to_pay: parseFloat(amount_to_pay) || 0,
        is_paid: is_paid || false,
        paid_date: is_paid ? new Date().toISOString().split('T')[0] : null,
        notes: notes || null
      }, {
        onConflict: 'card_id,month,year'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error upserting monthly balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a specific monthly balance
const updateMonthlyBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_balance, amount_to_pay, is_paid, notes } = req.body;

    // Verify the balance entry belongs to user's card
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('monthly_card_balances')
      .select(`
        *,
        credit_cards!inner (user_id)
      `)
      .eq('id', id)
      .single();

    if (existingError || !existing || existing.credit_cards.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Monthly balance not found' });
    }

    const updateData = {};
    if (current_balance !== undefined) updateData.current_balance = parseFloat(current_balance);
    if (amount_to_pay !== undefined) updateData.amount_to_pay = parseFloat(amount_to_pay);
    if (is_paid !== undefined) {
      updateData.is_paid = is_paid;
      updateData.paid_date = is_paid ? new Date().toISOString().split('T')[0] : null;
    }
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('monthly_card_balances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating monthly balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle payment status
const togglePaymentStatus = async (req, res) => {
  try {
    const { card_id, month, year } = req.body;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Verify the card belongs to the user
    const { data: card, error: cardError } = await supabaseAdmin
      .from('credit_cards')
      .select('id')
      .eq('id', card_id)
      .eq('user_id', req.user.id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Check if entry exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('monthly_card_balances')
      .select('*')
      .eq('card_id', card_id)
      .eq('month', monthNum)
      .eq('year', yearNum)
      .single();

    let data;
    if (existing) {
      // Toggle existing
      const { data: updated, error } = await supabaseAdmin
        .from('monthly_card_balances')
        .update({
          is_paid: !existing.is_paid,
          paid_date: !existing.is_paid ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      data = updated;
    } else {
      // Create new with is_paid = true
      const { data: created, error } = await supabaseAdmin
        .from('monthly_card_balances')
        .insert({
          card_id,
          month: monthNum,
          year: yearNum,
          current_balance: 0,
          amount_to_pay: 0,
          is_paid: true,
          paid_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      data = created;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error toggling payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a monthly balance
const deleteMonthlyBalance = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the balance entry belongs to user's card
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('monthly_card_balances')
      .select(`
        *,
        credit_cards!inner (user_id)
      `)
      .eq('id', id)
      .single();

    if (existingError || !existing || existing.credit_cards.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Monthly balance not found' });
    }

    const { error } = await supabaseAdmin
      .from('monthly_card_balances')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Monthly balance deleted' });
  } catch (error) {
    console.error('Error deleting monthly balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  getMonthlyBalances,
  getMonthlyOverview,
  upsertMonthlyBalance,
  updateMonthlyBalance,
  togglePaymentStatus,
  deleteMonthlyBalance
};
