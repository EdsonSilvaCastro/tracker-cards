import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, X } from 'lucide-react';
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  page: '#161616',
  card: '#1e1e1e',
  border: '0.5px solid #2e2e2e',
  accent: '#d4b72e',
  green: '#4CAF50',
  red: '#e53935',
  muted: '#888',
  text: '#e0e0e0',
};

const cellStyle = {
  paid:      { background: '#1a3a1a', color: '#4CAF50', border: '0.5px solid #4CAF50', borderRadius: 3 },
  pending:   { background: '#2a2200', color: '#d4b72e', border: '0.5px solid #d4b72e', borderRadius: 3 },
  current:   { background: '#e53935', color: '#fff',    border: '0.5px solid #e53935', borderRadius: 3 },
  cancelled: { background: '#1a1a1a', color: '#444',    border: '0.5px solid #333',    borderRadius: 3 },
};

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
      <div style={{ background: C.page, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.page, minHeight: '100vh', padding: '24px', fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Page title ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarClock size={20} color={C.accent} />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Monthly Payments</h1>
        </div>

        {/* ════════════════════════════════════════════
            SECTION A — Form
        ════════════════════════════════════════════ */}
        <div style={{ background: C.card, border: C.border, borderRadius: 10, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: C.accent, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Nuevo plan de pago
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Nombre */}
            <div>
              <label style={labelStyle}>Nombre del gasto</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Ej. Netflix anual, iPhone 16..."
                value={form.name}
                onChange={e => setField('name', e.target.value)}
              />
            </div>

            {/* Tarjeta — segmented */}
            <div>
              <label style={labelStyle}>Tarjeta</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cards.filter(c => c.status !== 'inactive').map(c => {
                  const active = form.card_id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setField('card_id', c.id)}
                      style={active ? segActiveStyle : segInactiveStyle}
                    >
                      {c.card_name || c.bank}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monto + Plazo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Monto mensual</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 14 }}>$</span>
                  <input
                    style={{ ...inputStyle, paddingLeft: 22 }}
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
                <label style={labelStyle}>Plazo en meses</label>
                <input
                  style={inputStyle}
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
              <label style={labelStyle}>Mes de inicio</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <select style={inputStyle} value={form.start_month} onChange={e => setField('start_month', e.target.value)}>
                  {MONTHS_ES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select style={inputStyle} value={form.start_year} onChange={e => setField('start_year', e.target.value)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Live preview */}
            {allFilled && previewEnd && (
              <div style={{ background: '#111', borderLeft: `3px solid ${C.accent}`, borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
                Se cobrarán{' '}
                <strong style={{ color: C.accent }}>${fmtAmount(previewAmount)}</strong>
                {' × '}{previewMonths} meses en{' '}
                <strong style={{ color: C.text }}>{previewCard?.card_name || previewCard?.bank}</strong>
                {' · '}{fmtMonthYear(Number(form.start_month), Number(form.start_year))}
                {' → '}{fmtMonthYear(previewEnd.month, previewEnd.year)}
                <br />
                <span style={{ color: C.muted }}>Total: </span>
                <strong style={{ color: C.accent }}>${fmtAmount(previewAmount * previewMonths)}</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !allFilled}
              style={{ ...primaryBtnStyle, opacity: submitting || !allFilled ? 0.5 : 1 }}
            >
              {submitting ? 'Registrando...' : 'Registrar plan'}
            </button>
          </form>
        </div>

        {/* ════════════════════════════════════════════
            SECTION B — Plans list
        ════════════════════════════════════════════ */}
        <div style={{ background: C.card, border: C.border, borderRadius: 10, padding: '20px 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.accent }}>
              Planes activos
            </span>
            {thisMonthCommitment > 0 && (
              <span style={{ background: '#2a2200', border: `0.5px solid ${C.accent}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, color: C.accent, fontWeight: 600 }}>
                Este mes: ${fmtAmount(thisMonthCommitment)}
              </span>
            )}
          </div>

          {activePlans.length === 0 && (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No hay planes activos.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activePlans.map(plan => <PlanCard key={plan.id} plan={plan} cards={cards} nowYear={nowYear} nowMonth={nowMonth} onCancel={() => setConfirmCancel(plan)} />)}
          </div>

          {inactivePlans.length > 0 && (
            <>
              <div style={{ borderTop: '0.5px solid #2e2e2e', margin: '20px 0 16px' }} />
              <div style={{ opacity: 0.5 }}>
                <span style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
                  Completados / Cancelados
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {inactivePlans.map(plan => <PlanCard key={plan.id} plan={plan} cards={cards} nowYear={nowYear} nowMonth={nowMonth} inactive />)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════
            SECTION C — Calendar view
        ════════════════════════════════════════════ */}
        {calMonths.length > 0 && (
          <div style={{ background: C.card, border: C.border, borderRadius: 10, padding: '20px 24px' }}>

            {/* Header + toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.accent }}>
                Calendario de pagos
              </span>
              <div style={{ display: 'flex', gap: 0, border: '0.5px solid #333', borderRadius: 6, overflow: 'hidden' }}>
                {['gantt', 'tabla'].map(v => {
                  const active = calView === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setCalView(v)}
                      style={{
                        background: active ? '#2a2200' : '#111',
                        border: 'none',
                        borderLeft: v === 'tabla' ? '0.5px solid #333' : 'none',
                        color: active ? C.accent : '#666',
                        padding: '5px 14px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {calView === 'gantt'
                ? <GanttView plans={plans} months={calMonths} yearSpans={yearSpans} monthTotals={monthTotals} nowYear={nowYear} nowMonth={nowMonth} cardName={cardName} />
                : <TableView plans={plans} months={calMonths} yearSpans={yearSpans} monthTotals={monthTotals} nowYear={nowYear} nowMonth={nowMonth} cardName={cardName} />
              }
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: C.muted, flexWrap: 'wrap' }}>
              <span><span style={{ color: C.green }}>●</span> Pagado</span>
              <span><span style={{ color: C.accent }}>●</span> Pendiente</span>
              <span><span style={{ color: '#555' }}>●</span> Cancelado</span>
              <span><span style={{ color: C.red }}>●</span> Mes actual</span>
            </div>
          </div>
        )}

      </div>

      {/* ── Confirm cancel dialog ── */}
      {confirmCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#1e1e1e', border: '0.5px solid #2e2e2e', borderRadius: 10, padding: '24px', maxWidth: 380, width: '100%' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: C.text }}>
              ¿Cancelar {confirmCancel.name}?
            </h3>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
              Se eliminarán las cuotas futuras pendientes.
              Las cuotas ya pagadas se conservan.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCancel(null)}
                style={{ flex: 1, background: '#111', border: '0.5px solid #333', color: C.muted, borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 13 }}
              >
                Volver
              </button>
              <button
                onClick={() => handleCancelPlan(confirmCancel)}
                style={{ flex: 1, background: '#2a0800', border: `0.5px solid ${C.red}`, color: C.red, borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Cancelar plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          background: toast.isError ? '#2a0800' : '#1a3a1a',
          border: `0.5px solid ${toast.isError ? C.red : C.green}`,
          color: toast.isError ? C.red : C.green,
          fontSize: 13, padding: '10px 18px', borderRadius: 10, zIndex: 200,
          maxWidth: 360, textAlign: 'center', pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, cards, nowYear, nowMonth, onCancel, inactive }) {
  const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const card = cards.find(c => c.id === plan.card_id);
  const cardLabel = card ? (card.card_name || card.bank) : '—';
  const paidCount = plan.paid_count || 0;
  const progress = plan.total_months > 0 ? (paidCount / plan.total_months) * 100 : 0;
  const end = addMonths(plan.start_year, plan.start_month, plan.total_months - 1);
  const nextB = plan.next_billing;

  return (
    <div style={{ background: '#161616', border: '0.5px solid #2e2e2e', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e0e0e0' }}>{plan.name}</span>
            <span style={{ fontSize: 11, color: '#888' }}>{cardLabel} · {paidCount} de {plan.total_months} meses</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#d4b72e' }}>${fmtAmount(plan.monthly_amount)}<span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>/mes</span></span>
            <span style={{ fontSize: 11, color: '#888', marginLeft: 10 }}>Total ${fmtAmount(Number(plan.monthly_amount) * plan.total_months)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!inactive && (
            <span style={{ background: '#1a3a1a', color: '#4CAF50', border: '0.5px solid #4CAF50', borderRadius: 20, fontSize: 11, padding: '2px 10px', fontWeight: 600 }}>
              Activo
            </span>
          )}
          {inactive && (
            <span style={{ background: '#1a1a1a', color: '#555', border: '0.5px solid #333', borderRadius: 20, fontSize: 11, padding: '2px 10px' }}>
              {plan.status === 'cancelled' ? 'Cancelado' : 'Completado'}
            </span>
          )}
          {!inactive && onCancel && (
            <button
              onClick={onCancel}
              style={{ background: 'transparent', border: '0.5px solid #444', color: '#888', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#e53935'; e.currentTarget.style.color = '#e53935'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: '10px 0 6px', height: 4, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#4CAF50', borderRadius: 3, transition: 'width 0.4s' }} />
      </div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: '#888' }}>
        {nextB && <span>Próximo cobro: {MONTHS_ES[nextB.billing_month - 1]} {nextB.billing_year} · </span>}
        <span>Termina: {MONTHS_ES[end.month - 1]} {end.year}</span>
      </div>
    </div>
  );
}

// ── GanttView ─────────────────────────────────────────────────────────────────
function GanttView({ plans, months, yearSpans, monthTotals, nowYear, nowMonth, cardName }) {
  const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const COL = 34;
  const LABEL = 140;

  return (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: LABEL + months.length * COL }}>
      <colgroup>
        <col style={{ width: LABEL }} />
        {months.map((_, i) => <col key={i} style={{ width: COL }} />)}
      </colgroup>
      <thead>
        {/* Year row */}
        <tr>
          <td />
          {yearSpans.map((s, i) => (
            <td key={i} colSpan={s.count} style={{ fontSize: 11, color: '#d4b72e', fontWeight: 700, paddingBottom: 4, paddingLeft: 4, borderBottom: '0.5px solid #2e2e2e', whiteSpace: 'nowrap' }}>
              {s.year}
            </td>
          ))}
        </tr>
        {/* Month row */}
        <tr>
          <td style={{ fontSize: 11, color: '#555', paddingBottom: 6, paddingRight: 8, textAlign: 'right' }}>Plan</td>
          {months.map(({ year, month }, i) => {
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} style={{ fontSize: 10, textAlign: 'center', paddingBottom: 6, color: isCur ? '#d4b72e' : '#555', fontWeight: isCur ? 700 : 400, whiteSpace: 'nowrap' }}>
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
            <tr key={plan.id}>
              <td style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', paddingRight: 10, paddingBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: LABEL, verticalAlign: 'middle' }}>
                {plan.name}
                <div style={{ fontSize: 10, color: '#666', fontWeight: 400 }}>{cardName(plan.card_id)}</div>
              </td>
              {segments.map((seg, si) => {
                const span = seg.endIdx - seg.startIdx + 1;
                const st = seg.state;
                const cs = st ? cellStyle[st] : null;
                const showLabel = span > 2 && st && st !== null;
                return (
                  <td
                    key={si}
                    colSpan={span}
                    style={{
                      height: 28,
                      padding: '2px 3px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {cs && (
                      <div style={{ ...cs, height: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {showLabel && (
                          <span style={{ padding: '0 4px' }}>
                            {st === 'paid' ? 'Pagado' : st === 'pending' ? 'Pendiente' : st === 'current' ? 'Actual' : 'Cancelado'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}

        {/* Total row */}
        <tr style={{ borderTop: '0.5px solid #2e2e2e' }}>
          <td style={{ fontSize: 11, color: '#888', paddingTop: 8, paddingRight: 10, fontWeight: 600, verticalAlign: 'middle' }}>Total</td>
          {monthTotals.map((total, i) => {
            const { year, month } = months[i];
            const isCur = year === nowYear && month === nowMonth;
            const col = isCur ? '#fff' : total > 8000 ? '#e53935' : total > 5000 ? '#d4b72e' : '#4CAF50';
            const bg = isCur ? '#e53935' : 'transparent';
            return (
              <td key={i} style={{ fontSize: 10, textAlign: 'center', paddingTop: 8, color: col, background: bg, fontWeight: 600, borderRadius: 3 }}>
                {total > 0 ? fmtK(total) : ''}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

// ── TableView ─────────────────────────────────────────────────────────────────
function TableView({ plans, months, yearSpans, monthTotals, nowYear, nowMonth, cardName }) {
  const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const COL = 80;
  const LABEL = 140;

  return (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: LABEL + months.length * COL }}>
      <colgroup>
        <col style={{ width: LABEL }} />
        {months.map((_, i) => <col key={i} style={{ width: COL }} />)}
      </colgroup>
      <thead>
        {/* Year row */}
        <tr>
          <td />
          {yearSpans.map((s, i) => (
            <td key={i} colSpan={s.count} style={{ fontSize: 11, color: '#d4b72e', fontWeight: 700, paddingBottom: 4, paddingLeft: 4, borderBottom: '0.5px solid #2e2e2e', whiteSpace: 'nowrap' }}>
              {s.year}
            </td>
          ))}
        </tr>
        {/* Month row */}
        <tr>
          <td style={{ fontSize: 11, color: '#555', paddingBottom: 6, paddingRight: 8, textAlign: 'right' }}>Plan</td>
          {months.map(({ year, month }, i) => {
            const isCur = year === nowYear && month === nowMonth;
            return (
              <td key={i} style={{ fontSize: 10, textAlign: 'center', paddingBottom: 6, color: isCur ? '#d4b72e' : '#555', fontWeight: isCur ? 700 : 400 }}>
                {MONTHS_ES[month - 1]}
              </td>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => (
          <tr key={plan.id}>
            <td style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', paddingRight: 10, paddingBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: LABEL, verticalAlign: 'middle' }}>
              {plan.name}
              <div style={{ fontSize: 10, color: '#666', fontWeight: 400 }}>{cardName(plan.card_id)}</div>
            </td>
            {months.map(({ year, month }, i) => {
              const state = getCellState(plan, year, month, nowYear, nowMonth);
              const cs = state ? cellStyle[state] : null;
              return (
                <td key={i} style={{ padding: '2px 3px', verticalAlign: 'middle', height: 28 }}>
                  {cs && state !== 'cancelled' && (
                    <div style={{ ...cs, height: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, whiteSpace: 'nowrap' }}>
                      ${fmtAmount(plan.monthly_amount)}
                    </div>
                  )}
                  {state === 'cancelled' && (
                    <div style={{ ...cs, height: 22, borderRadius: 3 }} />
                  )}
                </td>
              );
            })}
          </tr>
        ))}

        {/* Total row */}
        <tr style={{ borderTop: '0.5px solid #2e2e2e' }}>
          <td style={{ fontSize: 11, color: '#888', paddingTop: 8, paddingRight: 10, fontWeight: 600 }}>Total</td>
          {monthTotals.map((total, i) => {
            const { year, month } = months[i];
            const isCur = year === nowYear && month === nowMonth;
            const col = isCur ? '#fff' : total > 8000 ? '#e53935' : total > 5000 ? '#d4b72e' : '#4CAF50';
            const bg = isCur ? '#e53935' : 'transparent';
            return (
              <td key={i} style={{ fontSize: 10, textAlign: 'center', paddingTop: 8, color: col, background: bg, fontWeight: 600, borderRadius: 3 }}>
                {total > 0 ? `$${fmtAmount(total)}` : ''}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

// ── Shared style objects ──────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500,
};

const inputStyle = {
  background: '#111', border: '0.5px solid #2e2e2e', borderRadius: 6,
  color: '#e0e0e0', padding: '8px 12px', fontSize: 14, width: '100%',
  outline: 'none', boxSizing: 'border-box',
};

const segInactiveStyle = {
  background: '#111', border: '0.5px solid #333', color: '#999',
  borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
};

const segActiveStyle = {
  background: '#2a2200', border: '0.5px solid #d4b72e', color: '#d4b72e',
  borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};

const primaryBtnStyle = {
  background: '#d4b72e', color: '#111', borderRadius: 6, border: 'none',
  fontWeight: 700, padding: '11px 20px', cursor: 'pointer', width: '100%',
  fontSize: 14, fontFamily: 'DM Sans, sans-serif',
};
