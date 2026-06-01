import { supabaseAdmin } from '../config/supabase.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function addMonths(year, month, delta) {
  const t = (month - 1) + delta;
  return { year: year + Math.floor(t / 12), month: (t % 12) + 1 };
}

// ─── POST /api/installment-plans ─────────────────────────────────────────────

export const createInstallmentPlan = async (req, res) => {
  try {
    const { name, card_id, monthly_amount, total_months, start_month, start_year } = req.body;

    // Validations
    if (!name || !card_id || monthly_amount == null || total_months == null || !start_month || !start_year) {
      return res.status(400).json({ success: false, error: 'All fields are required: name, card_id, monthly_amount, total_months, start_month, start_year' });
    }
    if (Number(monthly_amount) <= 0) {
      return res.status(400).json({ success: false, error: 'monthly_amount must be greater than 0' });
    }
    if (Number(total_months) < 1 || Number(total_months) > 60) {
      return res.status(400).json({ success: false, error: 'total_months must be between 1 and 60' });
    }
    if (Number(start_month) < 1 || Number(start_month) > 12) {
      return res.status(400).json({ success: false, error: 'start_month must be between 1 and 12' });
    }
    if (Number(start_year) < 2024) {
      return res.status(400).json({ success: false, error: 'start_year must be 2024 or later' });
    }

    // 1. Insert plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('installment_plans')
      .insert({
        user_id: req.user.id,
        name,
        card_id,
        monthly_amount: Number(monthly_amount),
        total_months: Number(total_months),
        start_month: Number(start_month),
        start_year: Number(start_year),
        status: 'active',
      })
      .select()
      .single();

    if (planError) throw planError;

    // 2. Build all transactions
    const transactions = [];
    for (let i = 0; i < Number(total_months); i++) {
      const { year: billing_year, month: billing_month } = addMonths(Number(start_year), Number(start_month), i);
      const transaction_date = `${billing_year}-${String(billing_month).padStart(2, '0')}-01`;
      transactions.push({
        user_id: req.user.id,
        card_id,
        amount: Number(monthly_amount),
        merchant: name,
        notes: `Cuota ${i + 1} de ${Number(total_months)}`,
        transaction_date,
        billing_month,
        billing_year,
        source: 'installment',
        installment_plan_id: plan.id,
        installment_number: i + 1,
        installment_status: 'pending',
      });
    }

    // 3. Batch insert
    const { error: txError } = await supabaseAdmin
      .from('card_transactions')
      .insert(transactions);

    if (txError) throw txError;

    res.status(201).json({ success: true, plan, transactions_created: transactions.length });
  } catch (error) {
    console.error('Error creating installment plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET /api/installment-plans ──────────────────────────────────────────────

export const getInstallmentPlans = async (req, res) => {
  try {
    // Fetch all plans for user
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('installment_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .order('status', { ascending: true }) // active sorts before cancelled/completed alphabetically — we fix order below
      .order('created_at', { ascending: false });

    if (plansError) throw plansError;
    if (!plans || plans.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Fetch transaction aggregates for all plans in one query
    const planIds = plans.map(p => p.id);
    const { data: txRows, error: txError } = await supabaseAdmin
      .from('card_transactions')
      .select('installment_plan_id, installment_status, billing_month, billing_year')
      .in('installment_plan_id', planIds);

    if (txError) throw txError;

    // Build a map: plan_id → { paid_count, remaining_count, next_billing }
    const aggregates = {};
    for (const planId of planIds) {
      aggregates[planId] = { paid_count: 0, remaining_count: 0, next_billing: null };
    }

    for (const tx of txRows || []) {
      const agg = aggregates[tx.installment_plan_id];
      if (!agg) continue;
      if (tx.installment_status === 'paid') {
        agg.paid_count++;
      } else if (tx.installment_status === 'pending') {
        agg.remaining_count++;
        // Track earliest pending
        if (
          !agg.next_billing ||
          tx.billing_year < agg.next_billing.billing_year ||
          (tx.billing_year === agg.next_billing.billing_year && tx.billing_month < agg.next_billing.billing_month)
        ) {
          agg.next_billing = { billing_month: tx.billing_month, billing_year: tx.billing_year };
        }
      }
    }

    // Merge and sort: active first, then completed/cancelled, then by created_at desc
    const enriched = plans.map(p => ({ ...p, ...aggregates[p.id] }));
    enriched.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching installment plans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE /api/installment-plans/:id  (soft cancel) ────────────────────────

export const cancelInstallmentPlan = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Verify ownership
    const { data: plan, error: fetchError } = await supabaseAdmin
      .from('installment_plans')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !plan) {
      return res.status(404).json({ success: false, error: 'Installment plan not found' });
    }
    if (plan.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (plan.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Plan is already cancelled' });
    }

    // 2. Soft-cancel the plan
    const { error: planUpdateError } = await supabaseAdmin
      .from('installment_plans')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (planUpdateError) throw planUpdateError;

    // 3. Cancel only future pending transactions (current month is kept as-is)
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;

    // Fetch all pending txs for this plan then filter in JS to avoid raw SQL
    const { data: pendingTxs, error: fetchTxError } = await supabaseAdmin
      .from('card_transactions')
      .select('id, billing_month, billing_year')
      .eq('installment_plan_id', id)
      .eq('installment_status', 'pending');

    if (fetchTxError) throw fetchTxError;

    const futureIds = (pendingTxs || [])
      .filter(tx =>
        tx.billing_year > nowYear ||
        (tx.billing_year === nowYear && tx.billing_month > nowMonth)
      )
      .map(tx => tx.id);

    if (futureIds.length > 0) {
      const { error: txUpdateError } = await supabaseAdmin
        .from('card_transactions')
        .update({ installment_status: 'cancelled' })
        .in('id', futureIds);

      if (txUpdateError) throw txUpdateError;
    }

    res.json({ success: true, cancelled_future_installments: futureIds.length });
  } catch (error) {
    console.error('Error cancelling installment plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
