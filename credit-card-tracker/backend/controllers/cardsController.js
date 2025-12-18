import { supabaseAdmin } from '../config/supabase.js';

// Get all credit cards for the authenticated user
export const getAllCards = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_cards')
      .select('*')
      .eq('user_id', req.userId)
      .order('bank', { ascending: true });

    if (error) throw error;

    // Calculate utilization for each card
    const cardsWithUtilization = data.map(card => ({
      ...card,
      utilization_percentage: card.credit_limit > 0 
        ? (card.current_balance / card.credit_limit * 100).toFixed(2)
        : 0
    }));

    res.json({ success: true, data: cardsWithUtilization });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get a single credit card by ID
export const getCardById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('credit_cards')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Card not found' 
      });
    }

    const cardWithUtilization = {
      ...data,
      utilization_percentage: data.credit_limit > 0 
        ? (data.current_balance / data.credit_limit * 100).toFixed(2)
        : 0
    };

    res.json({ success: true, data: cardWithUtilization });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new credit card
export const createCard = async (req, res) => {
  try {
    const cardData = {
      ...req.body,
      user_id: req.userId
    };

    const { data, error } = await supabaseAdmin
      .from('credit_cards')
      .insert([cardData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a credit card
export const updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove user_id from updates to prevent modification
    delete updates.user_id;

    const { data, error } = await supabaseAdmin
      .from('credit_cards')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Card not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a credit card
export const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('credit_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;

    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get card summary with statistics
export const getCardSummary = async (req, res) => {
  try {
    // Get cards directly instead of using the view
    const { data, error } = await supabaseAdmin
      .from('credit_cards')
      .select('*')
      .eq('user_id', req.userId);

    if (error) throw error;

    // Calculate totals
    const summary = {
      total_cards: data?.length || 0,
      total_credit_limit: (data || []).reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0),
      total_balance: (data || []).reduce((sum, card) => sum + parseFloat(card.current_balance || 0), 0),
      total_available: (data || []).reduce((sum, card) => sum + parseFloat(card.available_credit || 0), 0),
      total_unpaid_statements: 0,
      total_amount_due: 0,
      total_minimum_payment: 0,
      cards: data || []
    };

    summary.overall_utilization = summary.total_credit_limit > 0
      ? (summary.total_balance / summary.total_credit_limit * 100).toFixed(2)
      : 0;

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching card summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get utilization trend for a card
export const getUtilizationTrend = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    // First verify the card belongs to the user
    const { data: card } = await supabaseAdmin
      .from('credit_cards')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (!card) {
      return res.status(404).json({ 
        success: false, 
        error: 'Card not found' 
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await supabaseAdmin
      .from('utilization_history')
      .select('*')
      .eq('card_id', id)
      .gte('record_date', startDate.toISOString().split('T')[0])
      .order('record_date', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching utilization trend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAllCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  getCardSummary,
  getUtilizationTrend
};
