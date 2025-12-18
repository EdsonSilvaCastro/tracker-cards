import { supabaseAdmin } from '../config/supabase.js';

// Section display names
const SECTIONS = {
  living_expenses: 'Living Expenses',
  life_style: 'Life Style',
  monthly_payments: 'Monthly Payments',
  general_expenses: 'General Expenses'
};

// Get monthly budget overview with all sections
const getMonthlyBudget = async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get total budget for the month
    const { data: budgetData, error: budgetError } = await supabaseAdmin
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('month', monthNum)
      .eq('year', yearNum)
      .single();

    // Get all expenses for the month
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('month', monthNum)
      .eq('year', yearNum)
      .order('created_at', { ascending: true });

    if (expensesError && expensesError.code !== 'PGRST116') throw expensesError;

    // Group expenses by section
    const sections = {};
    Object.keys(SECTIONS).forEach(key => {
      sections[key] = {
        name: SECTIONS[key],
        key: key,
        expenses: [],
        total_budgeted: 0,
        total_spent: 0,
        remaining: 0,
        percentage_of_budget: 0,
        status: 'on_track'
      };
    });

    // Populate sections with expenses
    (expenses || []).forEach(expense => {
      if (sections[expense.section]) {
        sections[expense.section].expenses.push(expense);
        sections[expense.section].total_budgeted += parseFloat(expense.budgeted_amount || 0);
        sections[expense.section].total_spent += parseFloat(expense.actual_spent || 0);
      }
    });

    // Calculate section stats
    const totalBudget = budgetData?.total_budget || 0;
    let grandTotalBudgeted = 0;
    let grandTotalSpent = 0;

    Object.keys(sections).forEach(key => {
      const section = sections[key];
      section.remaining = section.total_budgeted - section.total_spent;
      section.percentage_of_budget = totalBudget > 0 
        ? (section.total_budgeted / totalBudget) * 100 
        : 0;
      
      // Determine section status
      if (section.total_spent > section.total_budgeted) {
        section.status = 'over_budget';
      } else if (section.total_spent >= section.total_budgeted * 0.9) {
        section.status = 'at_risk';
      } else {
        section.status = 'on_track';
      }

      grandTotalBudgeted += section.total_budgeted;
      grandTotalSpent += section.total_spent;
    });

    // Overall stats
    const overview = {
      month: monthNum,
      year: yearNum,
      total_budget: totalBudget,
      total_budgeted: grandTotalBudgeted,
      total_spent: grandTotalSpent,
      remaining_budget: totalBudget - grandTotalSpent,
      unallocated: totalBudget - grandTotalBudgeted,
      overall_status: grandTotalSpent > totalBudget ? 'over_budget' : 
                      grandTotalSpent >= totalBudget * 0.9 ? 'at_risk' : 'on_track',
      percentage_spent: totalBudget > 0 ? (grandTotalSpent / totalBudget) * 100 : 0
    };

    res.json({ 
      success: true, 
      data: {
        overview,
        sections: Object.values(sections),
        budget_id: budgetData?.id || null
      }
    });
  } catch (error) {
    console.error('Error fetching monthly budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Set or update monthly total budget
const upsertMonthlyBudget = async (req, res) => {
  try {
    const { month, year, total_budget, notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('monthly_budgets')
      .upsert({
        user_id: req.user.id,
        month: parseInt(month),
        year: parseInt(year),
        total_budget: parseFloat(total_budget) || 0,
        notes: notes || null
      }, {
        onConflict: 'user_id,month,year'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error upserting monthly budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add or update an expense
const upsertExpense = async (req, res) => {
  try {
    const { month, year, section, expense_name, budgeted_amount, actual_spent, status, notes } = req.body;

    if (!Object.keys(SECTIONS).includes(section)) {
      return res.status(400).json({ success: false, error: 'Invalid section' });
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .upsert({
        user_id: req.user.id,
        month: parseInt(month),
        year: parseInt(year),
        section,
        expense_name,
        budgeted_amount: parseFloat(budgeted_amount) || 0,
        actual_spent: parseFloat(actual_spent) || 0,
        status: status || 'pending',
        notes: notes || null
      }, {
        onConflict: 'user_id,month,year,section,expense_name'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error upserting expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update an existing expense by ID
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { expense_name, budgeted_amount, actual_spent, status, notes } = req.body;

    // Verify ownership
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const updateData = {};
    if (expense_name !== undefined) updateData.expense_name = expense_name;
    if (budgeted_amount !== undefined) updateData.budgeted_amount = parseFloat(budgeted_amount);
    if (actual_spent !== undefined) updateData.actual_spent = parseFloat(actual_spent);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const { error } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Copy budget from one month to another
const copyBudget = async (req, res) => {
  try {
    const { from_month, from_year, to_month, to_year, include_actual_spent } = req.body;

    // Get source expenses
    const { data: sourceExpenses, error: sourceError } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('month', parseInt(from_month))
      .eq('year', parseInt(from_year));

    if (sourceError) throw sourceError;

    if (!sourceExpenses || sourceExpenses.length === 0) {
      return res.status(404).json({ success: false, error: 'No expenses found in source month' });
    }

    // Get source budget
    const { data: sourceBudget } = await supabaseAdmin
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('month', parseInt(from_month))
      .eq('year', parseInt(from_year))
      .single();

    // Copy budget total
    if (sourceBudget) {
      await supabaseAdmin
        .from('monthly_budgets')
        .upsert({
          user_id: req.user.id,
          month: parseInt(to_month),
          year: parseInt(to_year),
          total_budget: sourceBudget.total_budget,
          notes: `Copied from ${from_month}/${from_year}`
        }, {
          onConflict: 'user_id,month,year'
        });
    }

    // Copy expenses - always set status to pending
    const newExpenses = sourceExpenses.map(exp => ({
      user_id: req.user.id,
      month: parseInt(to_month),
      year: parseInt(to_year),
      section: exp.section,
      expense_name: exp.expense_name,
      budgeted_amount: exp.budgeted_amount,
      actual_spent: include_actual_spent ? exp.actual_spent : 0,
      status: 'pending', // Always reset to pending when copying
      notes: exp.notes
    }));

    const { data, error } = await supabaseAdmin
      .from('monthly_budget_expenses')
      .upsert(newExpenses, {
        onConflict: 'user_id,month,year,section,expense_name'
      })
      .select();

    if (error) throw error;

    res.json({ success: true, data, message: `Copied ${data.length} expenses` });
  } catch (error) {
    console.error('Error copying budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  getMonthlyBudget,
  upsertMonthlyBudget,
  upsertExpense,
  updateExpense,
  deleteExpense,
  copyBudget
};
