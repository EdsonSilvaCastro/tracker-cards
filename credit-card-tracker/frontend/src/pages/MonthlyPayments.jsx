import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../lib/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS = [2024, 2025, 2026, 2027];

// ── Helpers ───────────────────────────────────────────────────────────────────
function addMonths(year, month, delta) {
  const t = (month - 1) + delta;
  return { year: year + Math.floor(t / 12), month: (t % 12) + 1 };
}

function fmtAmount(n) {
  return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

function fmtMonthYear(month, year) {
  return `${MONTHS_ES[month - 1]} ${year}`;
}

function fmtK(n) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

function getMonthRange(plans) {
  if (!plans.length) return [];
  let minYear = Infinity, minMonth = 13;
  let maxYear = -Infinity, maxMonth = 0;
  for (const plan of plans) {
    const sy = plan.start_year, sm = plan.start_month;
    const end = addMonths(sy, sm, plan.total_months - 1);
    if (sy < minYear || (sy === minYear && sm < minMonth)) { minYear = sy; minMonth = sm; }
    if (end.year > maxYear || (end.year === maxYear && end.month > maxMonth)) { maxYear = end.year; maxMonth = end.month; }
  }
  const months = [];
  let y = minYear, m = minMonth;
  while (y < maxYear || (y === maxYear && m <= maxMonth)) {
    months.push({ year: y, month: m });
    m++; if (m > 12) { m = 1; y++; }
  }
  return months;
}

function getCellState(plan, year, month, nowYear, nowMonth) {
  const sy = plan.start_year, sm = plan.start_month;
  const end = addMonths(sy, sm, plan.total_months - 1);
  const afterStart = year > sy || (year === sy && month >= sm);
  const beforeEnd = year < end.year || (year === end.year && month <= end.month);
  if (!afterStart || !beforeEnd) return null;
  // Use actual transaction status when available (respects manual paid/unpaid toggles)
  const tx = plan.transactions?.find(t => t.billing_year === year && t.billing_month === month);
  if (tx) {
    if (tx.installment_status === 'cancelled') return 'cancelled';
    if (tx.installment_status === 'paid') return 'paid';
    if (year === nowYear && month === nowMonth) return 'current';
    return 'pending';
  }
  // Fallback date-based logic
  const isFuture = year > nowYear || (year === nowYear && month > nowMonth);
  if (plan.status === 'cancelled' && isFuture) return 'cancelled';
  if (year < nowYear || (year === nowYear && month < nowMonth)) return 'paid';
  if (year === nowYear && month === nowMonth) return 'current';
  return 'pending';
}

function getGanttSegments(plan, months, nowYear, nowMonth) {
  const result = [];
  let seg = null;
  for (let i = 0; i < months.length; i++) {
    const { year, month } = months[i];
    const state = getCellState(plan, year, month, nowYear, nowMonth);
    if (!seg || seg.state !== state) {
      if (seg) result.push(seg);
      seg = { state, startIdx: i, endIdx: i };
    } else {
      seg.endIdx = i;
    }
  }
  if (seg) result.push(seg);
  return result;
}

function getYearSpans(months) {
  const spans = [];
  for (const { year } of months) {
    if (!spans.length || spans[spans.length - 1].year !== year) {
      spans.push({ year, count: 1 });
    } else {
      spans[spans.length - 1].count++;
    }
  }
  return spans;
}

function getMonthTotals(plans, months, nowYear, nowMonth) {
  return months.map(({ year, month }) => {
    let total = 0;
    for (const plan of plans) {
      const state = getCellState(plan, year, month, nowYear, nowMonth);
      if (state && state !== 'cancelled') total += Number(plan.monthly_amount);
    }
    return total;
  });
}

// ── Cell class helpers ────────────────────────────────────────────────────────
function cellClasses(state) {
  if (state === 'paid')      return 'bg-green-400 border border-black';
  if (state === 'pending')   return 'bg-(--color-primary) border border-black';
  if (state === 'current')   return 'bg-black text-white border border-black';
  if (state === 'cancelled') return 'bg-gray-100 border border-black';
  return '';
}

function totalCellClasses(total, isCur) {
  if (isCur)         return 'bg-black text-white border border-black font-bold';
  if (total > 8000)  return 'bg-red-400 border border-black font-bold';
  if (total > 5000)  return 'bg-orange-300 border border-black font-bold';
  return 'bg-green-400 border border-black font-bold';
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MonthlyPayments() {
  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();

  const [cards, setCards] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [calView, setCalView] = useState('gantt');
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', card_id: '', monthly_amount: '', start_month: '', start_year: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [toggling, setToggling] = useState(null); // 'planId-year-month'

  const [form, setForm] = useState({
    name: '',
    card_id: '',
    monthly_amount: '',
    total_months: '',
    start_month: String(nowMonth),
    start_year: String(nowYear),
  });

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cardsRes, plansRes] = await Promise.all([
        api.get('/cards'),
        api.get('/installment-plans'),
      ]);
      setCards(cardsRes.data.data || []);
      setPlans(plansRes.data.data || []);
    } catch (err) {
      showToast('Error al cargar datos: ' + (err.response?.data?.error || err.message), true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Form helpers ────────────────────────────────────────────────────────────
  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const allFilled = form.name && form.card_id && form.monthly_amount && form.total_months
    && form.start_month && form.start_year;

  const previewCard = cards.find(c => c.id === form.card_id);
  const previewMonths = Number(form.total_months) || 0;
  const previewAmount = Number(form.monthly_amount) || 0;
  const previewEnd = previewMonths > 0
    ? addMonths(Number(form.start_year), Number(form.start_month), previewMonths - 1)
    : null;

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!allFilled) return;
    try {
      setSubmitting(true);
      const res = await api.post('/installment-plans', {
        name: form.name,
        card_id: form.card_id,
        monthly_amount: Number(form.monthly_amount),
        total_months: Number(form.total_months),
        start_month: Number(form.start_month),
        start_year: Number(form.start_year),
      });
      showToast(`Plan registrado · ${res.data.transactions_created} cuotas agregadas`);
      setForm({ name: '', card_id: '', monthly_amount: '', total_months: '', start_month: String(nowMonth), start_year: String(nowYear) });
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al registrar plan', true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Cancel plan ─────────────────────────────────────────────────────────────
  async function handleCancelPlan(plan) {
    try {
      const res = await api.delete(`/installment-plans/${plan.id}`);
      showToast(`Plan cancelado · ${res.data.cancelled_future_installments} cuotas futuras eliminadas`);
      setConfirmCancel(null);
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cancelar plan', true);
    }
  }

  // ── Edit plan ────────────────────────────────────────────────────────────────
  function openEdit(plan) {
    setEditForm({ name: plan.name, card_id: plan.card_id, monthly_amount: String(plan.monthly_amount), start_month: String(plan.start_month), start_year: String(plan.start_year) });
    setEditPlan(plan);
  }

  async function handleEditPlan(e) {
    e.preventDefault();
    if (!editPlan || !editForm.name || !editForm.card_id || !editForm.monthly_amount) return;
    try {
      setEditSubmitting(true);
      await api.put(`/installment-plans/${editPlan.id}`, {
        name: editForm.name,
        card_id: editForm.card_id,
        monthly_amount: Number(editForm.monthly_amount),
        start_month: Number(editForm.start_month),
        start_year: Number(editForm.start_year),
      });
      showToast('Plan actualizado');
      setEditPlan(null);
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al actualizar plan', true);
    } finally {
      setEditSubmitting(false);
    }
  }

  // ── Toggle installment paid/pending ──────────────────────────────────────────
  async function handleToggleInstallment(planId, year, month) {
    const key = `${planId}-${year}-${month}`;
    if (toggling === key) return;
    try {
      setToggling(key);
      await api.patch(`/installment-plans/${planId}/toggle-installment`, {
        billing_year: year,
        billing_month: month,
      });
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Error al cambiar estado', true);
    } finally {
      setToggling(null);
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const activePlans = plans.filter(p => p.status === 'active');
  const inactivePlans = plans.filter(p => p.status !== 'active');

  const thisMonthCommitment = activePlans.reduce((sum, plan) => {
    const state = getCellState(plan, nowYear, nowMonth, nowYear, nowMonth);
    return state && state !== 'cancelled' ? sum + Number(plan.monthly_amount) : sum;
  }, 0);

  const calMonths = getMonthRange(plans);
  const yearSpans = getYearSpans(calMonths);
  const monthTotals = getMonthTotals(plans, calMonths, nowYear, nowMonth);

  function cardName(cardId) {
    const c = cards.find(x => x.id === cardId);
    return c ? (c.card_name || c.bank || 'Tarjeta') : '—';
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="border-b-2 border-black pb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-6 w-6" />
          <h1 className="font-head text-2xl font-black">Monthly Payments</h1>
        </div>
        <p className="text-sm text-gray-600 font-bold mt-1">Gestiona tus planes de pago en cuotas</p>
      </div>

      {/* ════════════════════════════════════════════
          SECTION A — Form
      ════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="bg-(--color-primary)">
          <CardTitle>Nuevo plan de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del gasto</label>
              <input
                className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] placeholder-gray-400 focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
                type="text"
                placeholder="Ej. Netflix anual, iPhone 16..."
                value={form.name}
                onChange={e => setField('name', e.target.value)}
              />
            </div>

            {/* Tarjeta — segmented */}
            <div>
              <label className="block text-sm font-medium mb-2">Tarjeta</label>
              <div className="flex flex-wrap gap-2">
                {cards.filter(c => c.status !== 'inactive').length === 0 ? (
                  <p className="text-sm text-gray-500 border-2 border-dashed border-gray-300 px-3 py-1.5">
                    Sin tarjetas registradas
                  </p>
                ) : (
                  cards.filter(c => c.status !== 'inactive').map(c => {
                    const active = form.card_id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setField('card_id', c.id)}
                        className={`px-3 py-1.5 text-sm font-medium border-2 border-black transition-all cursor-pointer ${
                          active
                            ? 'bg-(--color-primary) font-bold shadow-[2px_2px_0_0_#000]'
                            : 'bg-white hover:bg-(--color-accent)'
                        }`}
                      >
                        {c.card_name || c.bank}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Monto + Plazo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monto mensual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">$</span>
                  <input
                    className="w-full pl-7 pr-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monthly_amount}
                    onChange={e => setField('monthly_amount', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plazo en meses</label>
                <input
                  className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
                  type="number"
                  min="1"
                  max="60"
                  placeholder="1–60"
                  value={form.total_months}
                  onChange={e => setField('total_months', e.target.value)}
                />
              </div>
            </div>

            {/* Mes de inicio */}
            <div>
              <label className="block text-sm font-medium mb-1">Mes de inicio</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                  value={form.start_month}
                  onChange={e => setField('start_month', e.target.value)}
                >
                  {MONTHS_ES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                  value={form.start_year}
                  onChange={e => setField('start_year', e.target.value)}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Live preview */}
            {allFilled && previewEnd && (
              <div className="border-2 border-black border-l-4 bg-(--color-accent) p-3 text-sm font-medium leading-relaxed shadow-[3px_3px_0_0_#000]">
                Se cobrarán{' '}
                <strong>${fmtAmount(previewAmount)}</strong>
                {' × '}{previewMonths} meses en{' '}
                <strong>{previewCard?.card_name || previewCard?.bank}</strong>
                {' · '}{fmtMonthYear(Number(form.start_month), Number(form.start_year))}
                {' → '}{fmtMonthYear(previewEnd.month, previewEnd.year)}
                <br />
                <span className="text-gray-700">Total: </span>
                <strong>${fmtAmount(previewAmount * previewMonths)}</strong>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || !allFilled}
              className="w-full"
            >
              {submitting ? 'Registrando...' : 'Registrar plan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════
          SECTION B — Plans list
      ════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planes activos</CardTitle>
            {thisMonthCommitment > 0 && (
              <span className="bg-(--color-primary) border-2 border-black text-sm font-bold px-3 py-0.5 shadow-[2px_2px_0_0_#000]">
                Este mes: ${fmtAmount(thisMonthCommitment)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activePlans.length === 0 && (
            <p className="text-sm text-gray-500 font-medium py-2">No hay planes activos.</p>
          )}
          <div className="space-y-3">
            {activePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} cards={cards} nowYear={nowYear} nowMonth={nowMonth} onCancel={() => setConfirmCancel(plan)} onEdit={() => openEdit(plan)} onToggle={handleToggleInstallment} />
            ))}
          </div>

          {inactivePlans.length > 0 && (
            <>
              <div className="border-t-2 border-black mt-5 mb-4" />
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Completados / Cancelados</p>
              <div className="space-y-3 opacity-60">
                {inactivePlans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} cards={cards} nowYear={nowYear} nowMonth={nowMonth} inactive />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════
          SECTION C — Calendar view
      ════════════════════════════════════════════ */}
      {calMonths.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Calendario de pagos</CardTitle>
              {/* Gantt / Tabla toggle */}
              <div className="flex border-2 border-black overflow-hidden">
                {['gantt', 'tabla'].map((v, i) => {
                  const active = calView === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setCalView(v)}
                      className={`px-4 py-1 text-sm font-medium cursor-pointer transition-colors ${
                        i > 0 ? 'border-l-2 border-black' : ''
                      } ${active ? 'bg-(--color-primary) font-bold' : 'bg-white hover:bg-(--color-accent)'}`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {calView === 'gantt'
                ? <GanttView plans={plans} months={calMonths} yearSpans={yearSpans} monthTotals={monthTotals} nowYear={nowYear} nowMonth={nowMonth} cardName={cardName} />
                : <TableView plans={plans} months={calMonths} yearSpans={yearSpans} monthTotals={monthTotals} nowYear={nowYear} nowMonth={nowMonth} cardName={cardName} onToggle={handleToggleInstallment} />
              }
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t-2 border-black text-xs font-bold text-gray-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 border border-black" /> Pagado</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-(--color-primary) border border-black" /> Pendiente</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-black" /> Mes actual</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-100 border border-black" /> Cancelado</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Edit plan modal ── */}
      {editPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0_0_#000] p-6 max-w-md w-full">
            <h3 className="font-head text-lg font-black mb-4 border-b-2 border-black pb-2">
              Editar · {editPlan.name}
            </h3>
            <form onSubmit={handleEditPlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tarjeta</label>
                <div className="flex flex-wrap gap-2">
                  {cards.filter(c => c.status !== 'inactive').length === 0 ? (
                    <p className="text-sm text-gray-500 border-2 border-dashed border-gray-300 px-3 py-1.5">
                      Sin tarjetas registradas
                    </p>
                  ) : (
                    cards.filter(c => c.status !== 'inactive').map(c => {
                      const active = editForm.card_id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, card_id: c.id }))}
                          className={`px-3 py-1.5 text-sm font-medium border-2 border-black transition-all cursor-pointer ${
                            active ? 'bg-(--color-primary) font-bold shadow-[2px_2px_0_0_#000]' : 'bg-white hover:bg-(--color-accent)'
                          }`}
                        >
                          {c.card_name || c.bank}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto mensual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">$</span>
                  <input
                    className="w-full pl-7 pr-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editForm.monthly_amount}
                    onChange={e => setEditForm(f => ({ ...f, monthly_amount: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Solo se actualizarán las cuotas pendientes</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mes de inicio</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                    value={editForm.start_month}
                    onChange={e => setEditForm(f => ({ ...f, start_month: e.target.value }))}
                  >
                    {MONTHS_ES.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] transition-all"
                    value={editForm.start_year}
                    onChange={e => setEditForm(f => ({ ...f, start_year: e.target.value }))}
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cambiarlo regenera todas las cuotas del plan</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditPlan(null)}>
                  Volver
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={editSubmitting}>
                  {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm cancel dialog ── */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0_0_#000] p-6 max-w-sm w-full">
            <h3 className="font-head text-lg font-black mb-2">¿Cancelar {confirmCancel.name}?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Se eliminarán las cuotas futuras pendientes.
              Las cuotas ya pagadas se conservan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(null)}>
                Volver
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => handleCancelPlan(confirmCancel)}>
                Cancelar plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 border-2 border-black px-4 py-2.5 text-sm font-bold shadow-[4px_4px_0_0_#000] max-w-sm text-center pointer-events-none ${
          toast.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, cards, nowYear, nowMonth, onCancel, onEdit, onToggle, inactive }) {
  const [expanded, setExpanded] = useState(false);
  const card = cards.find(c => c.id === plan.card_id);
  const cardLabel = card ? (card.card_name || card.bank) : '—';
  const paidCount = plan.paid_count || 0;
  const progress = plan.total_months > 0 ? (paidCount / plan.total_months) * 100 : 0;
  const end = addMonths(plan.start_year, plan.start_month, plan.total_months - 1);
  const nextB = plan.next_billing;
  const sortedTxs = plan.transactions
    ? [...plan.transactions].sort((a, b) => a.billing_year - b.billing_year || a.billing_month - b.billing_month)
    : [];

  return (
    <div className="bg-white border-2 border-black shadow-[3px_3px_0_0_#000] p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-sm">{plan.name}</span>
            <span className="text-xs text-gray-500">{cardLabel} · {paidCount} de {plan.total_months} meses</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-base font-black">${fmtAmount(plan.monthly_amount)}<span className="text-xs font-normal text-gray-500">/mes</span></span>
            <span className="text-xs text-gray-500">Total ${fmtAmount(Number(plan.monthly_amount) * plan.total_months)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!inactive && (
            <span className="bg-green-400 border border-black text-xs font-bold px-2 py-0.5">
              Activo
            </span>
          )}
          {inactive && (
            <span className="bg-gray-200 border border-black text-gray-600 text-xs font-bold px-2 py-0.5">
              {plan.status === 'cancelled' ? 'Cancelado' : 'Completado'}
            </span>
          )}
          {!inactive && onEdit && (
            <button
              onClick={onEdit}
              className="text-xs font-bold border-2 border-black px-2 py-0.5 bg-white hover:bg-(--color-accent) transition-colors cursor-pointer"
            >
              Editar
            </button>
          )}
          {!inactive && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-bold border-2 border-black px-2 py-0.5 bg-white hover:bg-red-100 hover:border-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 mb-2 h-2 bg-gray-200 border border-black overflow-hidden">
        <div
          className="h-full bg-green-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Meta */}
      <div className="text-xs text-gray-500 font-medium">
        {nextB && <span>Próximo cobro: {MONTHS_ES[nextB.billing_month - 1]} {nextB.billing_year} · </span>}
        <span>Termina: {MONTHS_ES[end.month - 1]} {end.year}</span>
      </div>

      {/* Expandable installments list */}
      {sortedTxs.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black mt-2 cursor-pointer transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Ocultar cuotas' : `Ver cuotas (${sortedTxs.length})`}
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sortedTxs.map(tx => {
                const isPaid = tx.installment_status === 'paid';
                const isCancelled = tx.installment_status === 'cancelled';
                const isCurrent = tx.billing_year === nowYear && tx.billing_month === nowMonth && !isPaid && !isCancelled;
                const label = `${MONTHS_ES[tx.billing_month - 1]} ${tx.billing_year}`;
                return (
                  <button
                    key={tx.id}
                    disabled={isCancelled || !onToggle}
                    onClick={() => onToggle?.(plan.id, tx.billing_year, tx.billing_month)}
                    title={isPaid ? 'Marcar como pendiente' : isCancelled ? 'Cancelado' : 'Marcar como pagado'}
                    className={`text-[10px] font-bold px-2 py-0.5 border border-black transition-all flex items-center gap-1 ${
                      isCancelled
                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-default'
                        : isPaid
                        ? 'bg-green-400 hover:bg-green-300 cursor-pointer'
                        : isCurrent
                        ? 'bg-black text-white hover:bg-gray-700 cursor-pointer'
                        : 'bg-(--color-primary) hover:bg-(--color-accent) cursor-pointer'
                    }`}
                  >
                    {isPaid && <Check className="h-2.5 w-2.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── GanttView ─────────────────────────────────────────────────────────────────
function GanttView({ plans, months, yearSpans, monthTotals, nowYear, nowMonth, cardName }) {
  const COL = 34;
  const LABEL = 140;

  return (
    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: LABEL + months.length * COL }}>
      <colgroup>
        <col style={{ width: LABEL }} />
        {months.map((_, i) => <col key={i} style={{ width: COL }} />)}
      </colgroup>
      <thead>
        {/* Year row */}
        <tr className="border-b-2 border-black bg-(--color-primary)">
          <td />
          {yearSpans.map((s, i) => (
            <td key={i} colSpan={s.count} className="text-xs font-black px-1 py-1 border-r-2 border-black whitespace-nowrap">
              {s.year}
            </td>
          ))}
        </tr>
        {/* Month row */}
        <tr className="border-b-2 border-black bg-(--color-accent)">
          <td className="text-xs font-bold text-gray-500 pr-2 text-right py-1">Plan</td>
          {months.map(({ year, month }, i) => {
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} className={`text-center py-1 border-r border-black text-[10px] whitespace-nowrap ${isCur ? 'bg-black text-white font-black' : 'font-bold text-gray-600'}`}>
                {MONTHS_ES[month - 1]}
              </td>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => {
          const segments = getGanttSegments(plan, months, nowYear, nowMonth);
          return (
            <tr key={plan.id} className="border-b border-black">
              <td className="text-xs font-bold pr-2 py-1 whitespace-nowrap overflow-hidden" style={{ maxWidth: LABEL, textOverflow: 'ellipsis' }}>
                {plan.name}
                <div className="text-[10px] font-normal text-gray-500">{cardName(plan.card_id)}</div>
              </td>
              {segments.map((seg, si) => {
                const span = seg.endIdx - seg.startIdx + 1;
                const st = seg.state;
                const showLabel = span > 2 && st;
                return (
                  <td key={si} colSpan={span} className="py-1 px-0.5 border-r border-black" style={{ height: 32 }}>
                    {st && (
                      <div className={`h-6 flex items-center justify-center text-[10px] font-bold overflow-hidden ${cellClasses(st)}`}>
                        {showLabel && (st === 'paid' ? 'Pagado' : st === 'pending' ? 'Pendiente' : st === 'current' ? 'Actual' : '')}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}

        {/* Total row */}
        <tr className="border-t-2 border-black bg-gray-50">
          <td className="text-xs font-black pr-2 py-1">Total</td>
          {monthTotals.map((total, i) => {
            const { year, month } = months[i];
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} className={`text-center py-1 border-r border-black text-[10px] ${total > 0 ? totalCellClasses(total, isCur) : 'text-gray-300'}`}>
                {total > 0 ? fmtK(total) : '—'}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

// ── TableView ─────────────────────────────────────────────────────────────────
function TableView({ plans, months, yearSpans, monthTotals, nowYear, nowMonth, cardName, onToggle }) {
  const COL = 86;
  const LABEL = 140;

  return (
    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: LABEL + months.length * COL }}>
      <colgroup>
        <col style={{ width: LABEL }} />
        {months.map((_, i) => <col key={i} style={{ width: COL }} />)}
      </colgroup>
      <thead>
        {/* Year row */}
        <tr className="border-b-2 border-black bg-(--color-primary)">
          <td />
          {yearSpans.map((s, i) => (
            <td key={i} colSpan={s.count} className="text-xs font-black px-1 py-1 border-r-2 border-black whitespace-nowrap">
              {s.year}
            </td>
          ))}
        </tr>
        {/* Month row */}
        <tr className="border-b-2 border-black bg-(--color-accent)">
          <td className="text-xs font-bold text-gray-500 pr-2 text-right py-1">Plan</td>
          {months.map(({ year, month }, i) => {
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} className={`text-center py-1 border-r border-black text-[10px] whitespace-nowrap ${isCur ? 'bg-black text-white font-black' : 'font-bold text-gray-600'}`}>
                {MONTHS_ES[month - 1]}
              </td>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => (
          <tr key={plan.id} className="border-b border-black">
            <td className="text-xs font-bold pr-2 py-1 whitespace-nowrap overflow-hidden" style={{ maxWidth: LABEL, textOverflow: 'ellipsis' }}>
              {plan.name}
              <div className="text-[10px] font-normal text-gray-500">{cardName(plan.card_id)}</div>
            </td>
            {months.map(({ year, month }, i) => {
              const state = getCellState(plan, year, month, nowYear, nowMonth);
              const canToggle = state && state !== 'cancelled' && onToggle;
              return (
                <td key={i} className="p-0.5 border-r border-black" style={{ height: 32 }}>
                  {state && (
                    <div
                      className={`h-6 flex items-center justify-center text-[10px] font-bold ${cellClasses(state)} ${canToggle ? 'cursor-pointer hover:opacity-75' : ''}`}
                      onClick={() => canToggle && onToggle(plan.id, year, month)}
                      title={canToggle ? (state === 'paid' ? 'Marcar como pendiente' : 'Marcar como pagado') : undefined}
                    >
                      {state !== 'cancelled' ? `$${fmtAmount(plan.monthly_amount)}` : ''}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}

        {/* Total row */}
        <tr className="border-t-2 border-black bg-gray-50">
          <td className="text-xs font-black pr-2 py-1">Total</td>
          {monthTotals.map((total, i) => {
            const { year, month } = months[i];
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} className={`text-center py-1 border-r border-black text-[10px] ${total > 0 ? totalCellClasses(total, isCur) : 'text-gray-300'}`}>
                {total > 0 ? `$${fmtAmount(total)}` : '—'}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
