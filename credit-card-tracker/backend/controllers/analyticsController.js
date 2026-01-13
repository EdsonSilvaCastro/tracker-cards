import { supabaseAdmin } from '../config/supabase.js';

// Get annual summary
export const getAnnualSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);

    // Get all months data in parallel
    const monthPromises = [];
    for (let month = 1; month <= 12; month++) {
      monthPromises.push(
        Promise.all([
          // Monthly balances (cards)
          supabaseAdmin
            .from('card_monthly_balances')
            .select('*, credit_cards(card_name, bank)')
            .eq('user_id', req.user.id)
            .eq('month', month)
            .eq('year', yearNum),
          // Budget data
          supabaseAdmin
            .from('monthly_budgets')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('month', month)
            .eq('year', yearNum)
            .single(),
          // Expenses
          supabaseAdmin
            .from('monthly_budget_expenses')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('month', month)
            .eq('year', yearNum)
        ])
      );
    }

    const monthlyResults = await Promise.all(monthPromises);

    const months = monthlyResults.map((results, index) => {
      const [cardsResult, budgetResult, expensesResult] = results;
      const cards = cardsResult.data || [];
      const budget = budgetResult.data;
      const expenses = expensesResult.data || [];

      const totalCardPayments = cards.reduce((sum, c) => sum + parseFloat(c.amount_to_pay || 0), 0);
      const totalBudget = budget?.total_budget || 0;
      const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.actual_spent || 0), 0);
      const totalBudgeted = expenses.reduce((sum, e) => sum + parseFloat(e.budgeted_amount || 0), 0);

      return {
        month: index + 1,
        total_card_payments: totalCardPayments,
        total_budget: totalBudget,
        total_budgeted: totalBudgeted,
        total_spent: totalSpent,
        cards_paid: cards.filter(c => c.is_paid).length,
        total_cards: cards.length,
        budget_status: totalBudget >= totalCardPayments ? 'under' : 'over',
        difference: totalBudget - totalCardPayments
      };
    });

    // Calculate annual totals
    const annual = {
      year: yearNum,
      total_card_payments: months.reduce((sum, m) => sum + m.total_card_payments, 0),
      total_budget: months.reduce((sum, m) => sum + m.total_budget, 0),
      total_budgeted: months.reduce((sum, m) => sum + m.total_budgeted, 0),
      total_spent: months.reduce((sum, m) => sum + m.total_spent, 0),
      average_monthly_cards: months.reduce((sum, m) => sum + m.total_card_payments, 0) / 12,
      average_monthly_budget: months.reduce((sum, m) => sum + m.total_budget, 0) / 12,
      months_under_budget: months.filter(m => m.budget_status === 'under').length,
      months_over_budget: months.filter(m => m.budget_status === 'over').length
    };

    // Best and worst months
    const sortedBySpending = [...months].sort((a, b) => a.total_card_payments - b.total_card_payments);
    annual.lowest_spending_month = sortedBySpending[0];
    annual.highest_spending_month = sortedBySpending[sortedBySpending.length - 1];

    res.json({ 
      success: true, 
      data: { 
        annual,
        months 
      } 
    });
  } catch (error) {
    console.error('Error fetching annual summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Compare two months
export const compareMonths = async (req, res) => {
  try {
    const { month1, year1, month2, year2 } = req.query;

    const getMonthData = async (month, year) => {
      const [cardsResult, budgetResult, expensesResult] = await Promise.all([
        supabaseAdmin
          .from('card_monthly_balances')
          .select('*, credit_cards(card_name, bank)')
          .eq('user_id', req.user.id)
          .eq('month', parseInt(month))
          .eq('year', parseInt(year)),
        supabaseAdmin
          .from('monthly_budgets')
          .select('*')
          .eq('user_id', req.user.id)
          .eq('month', parseInt(month))
          .eq('year', parseInt(year))
          .single(),
        supabaseAdmin
          .from('monthly_budget_expenses')
          .select('*')
          .eq('user_id', req.user.id)
          .eq('month', parseInt(month))
          .eq('year', parseInt(year))
      ]);

      const cards = cardsResult.data || [];
      const budget = budgetResult.data;
      const expenses = expensesResult.data || [];

      // Group expenses by section
      const sections = {};
      expenses.forEach(exp => {
        if (!sections[exp.section]) {
          sections[exp.section] = { budgeted: 0, spent: 0 };
        }
        sections[exp.section].budgeted += parseFloat(exp.budgeted_amount || 0);
        sections[exp.section].spent += parseFloat(exp.actual_spent || 0);
      });

      return {
        month: parseInt(month),
        year: parseInt(year),
        total_card_payments: cards.reduce((sum, c) => sum + parseFloat(c.amount_to_pay || 0), 0),
        total_budget: budget?.total_budget || 0,
        total_spent: expenses.reduce((sum, e) => sum + parseFloat(e.actual_spent || 0), 0),
        total_budgeted: expenses.reduce((sum, e) => sum + parseFloat(e.budgeted_amount || 0), 0),
        cards_count: cards.length,
        expenses_count: expenses.length,
        sections
      };
    };

    const [data1, data2] = await Promise.all([
      getMonthData(month1, year1),
      getMonthData(month2, year2)
    ]);

    // Calculate differences
    const comparison = {
      month1: data1,
      month2: data2,
      differences: {
        card_payments: data2.total_card_payments - data1.total_card_payments,
        card_payments_percent: data1.total_card_payments > 0 
          ? ((data2.total_card_payments - data1.total_card_payments) / data1.total_card_payments * 100).toFixed(1)
          : 0,
        budget: data2.total_budget - data1.total_budget,
        spent: data2.total_spent - data1.total_spent,
        spent_percent: data1.total_spent > 0 
          ? ((data2.total_spent - data1.total_spent) / data1.total_spent * 100).toFixed(1)
          : 0
      }
    };

    res.json({ success: true, data: comparison });
  } catch (error) {
    console.error('Error comparing months:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get spending trends (last N months)
export const getSpendingTrends = async (req, res) => {
  try {
    const { months: numMonths = 6 } = req.query;
    const now = new Date();
    const trends = [];

    for (let i = 0; i < parseInt(numMonths); i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const [cardsResult, expensesResult] = await Promise.all([
        supabaseAdmin
          .from('card_monthly_balances')
          .select('amount_to_pay')
          .eq('user_id', req.user.id)
          .eq('month', month)
          .eq('year', year),
        supabaseAdmin
          .from('monthly_budget_expenses')
          .select('actual_spent, section')
          .eq('user_id', req.user.id)
          .eq('month', month)
          .eq('year', year)
      ]);

      const cards = cardsResult.data || [];
      const expenses = expensesResult.data || [];

      // Group by section
      const bySection = {};
      expenses.forEach(exp => {
        if (!bySection[exp.section]) bySection[exp.section] = 0;
        bySection[exp.section] += parseFloat(exp.actual_spent || 0);
      });

      trends.push({
        month,
        year,
        label: `${month}/${year}`,
        total_cards: cards.reduce((sum, c) => sum + parseFloat(c.amount_to_pay || 0), 0),
        total_expenses: expenses.reduce((sum, e) => sum + parseFloat(e.actual_spent || 0), 0),
        by_section: bySection
      });
    }

    // Reverse to show oldest first
    trends.reverse();

    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
