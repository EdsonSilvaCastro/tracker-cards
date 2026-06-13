import { supabaseAdmin } from '../config/supabase.js';

// ─── GET /api/savings-allocations/:month/:year ────────────────────────────────

export const getAllocations = async (req, res) => {
  try {
    const { month, year } = req.params;

    const { data, error } = await supabaseAdmin
      .from('monthly_savings_allocations')
      .select('id, savings_goal_id, amount, contribution_id, savings_goals(goal_name)')
      .eq('user_id', req.user.id)
      .eq('month', Number(month))
      .eq('year', Number(year));

    if (error) throw error;

    const allocations = (data || []).map(a => ({
      id: a.id,
      savings_goal_id: a.savings_goal_id,
      goal_name: a.savings_goals?.goal_name || '—',
      amount: a.amount,
      contribution_id: a.contribution_id,
    }));

    res.json({ success: true, data: allocations });
  } catch (error) {
    console.error('Error fetching savings allocations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── POST /api/savings-allocations (upsert) ───────────────────────────────────

export const upsertAllocation = async (req, res) => {
  try {
    const { month, year, savings_goal_id, amount } = req.body;

    if (!month || !year || !savings_goal_id || amount == null) {
      return res.status(400).json({ success: false, error: 'month, year, savings_goal_id and amount are required' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be greater than 0' });
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('savings_goals')
      .select('id, current_amount, target_amount, status')
      .eq('id', savings_goal_id)
      .eq('user_id', req.user.id)
      .single();

    if (goalError || !goal) {
      return res.status(404).json({ success: false, error: 'Savings goal not found' });
    }

    const newAmount = Number(amount);
    const contributionDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // Check for existing allocation (same goal, same month/year)
    const { data: existing } = await supabaseAdmin
      .from('monthly_savings_allocations')
      .select('id, amount, contribution_id')
      .eq('user_id', req.user.id)
      .eq('month', Number(month))
      .eq('year', Number(year))
      .eq('savings_goal_id', savings_goal_id)
      .maybeSingle();

    let updatedGoalAmount = Number(goal.current_amount);

    if (existing) {
      // --- UPDATE path ---
      const oldAmount = Number(existing.amount);

      // Delete old contribution if it exists
      if (existing.contribution_id) {
        await supabaseAdmin
          .from('savings_contributions')
          .delete()
          .eq('id', existing.contribution_id);
      }

      // Adjust current_amount: remove old, add new
      updatedGoalAmount = Math.max(0, updatedGoalAmount - oldAmount) + newAmount;
    }

    // Create new contribution
    const { data: contribution, error: contribError } = await supabaseAdmin
      .from('savings_contributions')
      .insert({
        goal_id: savings_goal_id,
        user_id: req.user.id,
        amount: newAmount,
        contribution_type: 'deposit',
        contribution_date: contributionDate,
        notes: 'Ahorro mensual',
      })
      .select()
      .single();

    if (contribError) throw contribError;

    if (!existing) {
      updatedGoalAmount = Number(goal.current_amount) + newAmount;
    }

    // Update savings goal current_amount
    const newStatus = updatedGoalAmount >= Number(goal.target_amount) ? 'completed' : goal.status;
    await supabaseAdmin
      .from('savings_goals')
      .update({ current_amount: updatedGoalAmount, status: newStatus })
      .eq('id', savings_goal_id);

    // Upsert allocation with new contribution_id
    const allocationPayload = {
      user_id: req.user.id,
      month: Number(month),
      year: Number(year),
      savings_goal_id,
      amount: newAmount,
      contribution_id: contribution.id,
      updated_at: new Date().toISOString(),
    };

    let allocationData;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('monthly_savings_allocations')
        .update(allocationPayload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      allocationData = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('monthly_savings_allocations')
        .insert(allocationPayload)
        .select()
        .single();
      if (error) throw error;
      allocationData = data;
    }

    res.status(existing ? 200 : 201).json({ success: true, data: allocationData });
  } catch (error) {
    console.error('Error upserting savings allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE /api/savings-allocations/:id ─────────────────────────────────────

export const deleteAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch allocation + verify ownership
    const { data: allocation, error: fetchError } = await supabaseAdmin
      .from('monthly_savings_allocations')
      .select('id, user_id, savings_goal_id, amount, contribution_id')
      .eq('id', id)
      .single();

    if (fetchError || !allocation) {
      return res.status(404).json({ success: false, error: 'Allocation not found' });
    }
    if (allocation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const allocationAmount = Number(allocation.amount);

    // Delete the linked contribution
    if (allocation.contribution_id) {
      await supabaseAdmin
        .from('savings_contributions')
        .delete()
        .eq('id', allocation.contribution_id);
    }

    // Revert current_amount on the savings goal
    const { data: goal } = await supabaseAdmin
      .from('savings_goals')
      .select('current_amount, status, target_amount')
      .eq('id', allocation.savings_goal_id)
      .single();

    if (goal) {
      const revertedAmount = Math.max(0, Number(goal.current_amount) - allocationAmount);
      const revertedStatus = goal.status === 'completed' && revertedAmount < Number(goal.target_amount)
        ? 'active'
        : goal.status;
      await supabaseAdmin
        .from('savings_goals')
        .update({ current_amount: revertedAmount, status: revertedStatus })
        .eq('id', allocation.savings_goal_id);
    }

    // Delete the allocation
    await supabaseAdmin
      .from('monthly_savings_allocations')
      .delete()
      .eq('id', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting savings allocation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
