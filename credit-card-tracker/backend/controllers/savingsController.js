import { supabaseAdmin } from '../config/supabase.js';

// Get all savings goals for a user
export const getSavingsGoals = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate progress for each goal
    const goalsWithProgress = (data || []).map(goal => ({
      ...goal,
      progress_percentage: goal.target_amount > 0 
        ? Math.min((goal.current_amount / goal.target_amount) * 100, 100).toFixed(1)
        : 0,
      remaining: Math.max(goal.target_amount - goal.current_amount, 0),
      days_remaining: goal.target_date 
        ? Math.max(Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24)), 0)
        : null
    }));

    res.json({ success: true, data: goalsWithProgress });
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get a single savings goal with contributions
export const getSavingsGoalById = async (req, res) => {
  try {
    const { id } = req.params;

    const [goalResult, contributionsResult] = await Promise.all([
      supabaseAdmin
        .from('savings_goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single(),
      supabaseAdmin
        .from('savings_contributions')
        .select('*')
        .eq('goal_id', id)
        .eq('user_id', req.user.id)
        .order('contribution_date', { ascending: false })
    ]);

    if (goalResult.error) throw goalResult.error;

    const goal = goalResult.data;
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({
      success: true,
      data: {
        ...goal,
        contributions: contributionsResult.data || [],
        progress_percentage: goal.target_amount > 0 
          ? Math.min((goal.current_amount / goal.target_amount) * 100, 100).toFixed(1)
          : 0,
        remaining: Math.max(goal.target_amount - goal.current_amount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching savings goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new savings goal
export const createSavingsGoal = async (req, res) => {
  try {
    const { goal_name, target_amount, target_date, category, color, icon, notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .insert({
        user_id: req.user.id,
        goal_name,
        target_amount: parseFloat(target_amount) || 0,
        current_amount: 0,
        target_date: target_date || null,
        category: category || 'general',
        color: color || '#6366f1',
        icon: icon || 'piggy-bank',
        status: 'active',
        notes: notes || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating savings goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a savings goal
export const updateSavingsGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.user_id;
    delete updates.id;

    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating savings goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete a savings goal
export const deleteSavingsGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add contribution to a goal
export const addContribution = async (req, res) => {
  try {
    const { goal_id, amount, contribution_type, contribution_date, notes } = req.body;

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('id', goal_id)
      .eq('user_id', req.user.id)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    // Create contribution
    const { data: contribution, error: contribError } = await supabaseAdmin
      .from('savings_contributions')
      .insert({
        goal_id,
        user_id: req.user.id,
        amount: parseFloat(amount) || 0,
        contribution_type: contribution_type || 'deposit',
        contribution_date: contribution_date || new Date().toISOString().split('T')[0],
        notes: notes || null
      })
      .select()
      .single();

    if (contribError) throw contribError;

    // Update goal current_amount
    const amountChange = contribution_type === 'withdrawal' 
      ? -parseFloat(amount) 
      : parseFloat(amount);
    
    const newAmount = Math.max(0, parseFloat(goal.current_amount) + amountChange);

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('savings_goals')
      .update({ 
        current_amount: newAmount,
        status: newAmount >= goal.target_amount ? 'completed' : goal.status
      })
      .eq('id', goal_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(201).json({ 
      success: true, 
      data: { 
        contribution, 
        goal: updatedGoal 
      } 
    });
  } catch (error) {
    console.error('Error adding contribution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get savings summary
export const getSavingsSummary = async (req, res) => {
  try {
    const { data: goals, error } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const activeGoals = goals?.filter(g => g.status === 'active') || [];
    const completedGoals = goals?.filter(g => g.status === 'completed') || [];

    const summary = {
      total_goals: goals?.length || 0,
      active_goals: activeGoals.length,
      completed_goals: completedGoals.length,
      total_target: goals?.reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0) || 0,
      total_saved: goals?.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0) || 0,
      active_target: activeGoals.reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0),
      active_saved: activeGoals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0)
    };

    summary.overall_progress = summary.total_target > 0 
      ? ((summary.total_saved / summary.total_target) * 100).toFixed(1)
      : 0;

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching savings summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
