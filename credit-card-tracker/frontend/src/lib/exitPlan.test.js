import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG, SEED_PLAZOS, ymToIdx, planTotal, ahorroPlan, extras, fondo, reservado, libre,
  necesita, necesitaDoble, mesesCubiertos, puenteDirecto, desvio, fechaEscenario, idxToYm,
  plazosFromPlans, buildView,
} from './exitPlan';

const mk = (closings = [], cfg = {}) => ({
  cfg: { ...DEFAULT_CONFIG, ...cfg },
  plazos: SEED_PLAZOS,
  closings,
});
const I = ymToIdx;
const CIERRES = [
  { month: '2026-10', ahorrado: 41800, retiros: 0 },
  { month: '2026-11', ahorrado: 24500, retiros: 30000 },
];
const fecha = (r) => (r.tipo === 'fecha' ? idxToYm(r.mes) : r.tipo);

describe('sin cierres', () => {
  const model = mk();
  // Fondo del plan = fondo de cierres hipotéticos con ahorrado = planTotal
  const planFondo = (ym) => {
    const retiros = Object.fromEntries(model.cfg.retirosPlaneados.map((r) => [r.month, r.amount]));
    const cierres = [];
    for (let i = I('2026-10'); i <= I(ym); i++) {
      cierres.push({ month: idxToYm(i), ahorrado: planTotal(model, i), retiros: retiros[idxToYm(i)] || 0 });
    }
    return fondo({ ...model, closings: cierres }, I(ym));
  };

  it.each([
    ['2026-10', 29354, 235054],
    ['2026-11', 31054, 236108],
    ['2026-12', 32054, 306162],
    ['2027-01', 33154, 339316],
    ['2027-02', 33854, 373170],
    ['2027-03', 33854, 323024],
    ['2027-04', 35654, 358678],
    ['2027-05', 35654, 394332],
  ])('%s: ahorro %i, fondo %i', (ym, ahorro, f) => {
    expect(ahorroPlan(model, I(ym))).toBe(ahorro);
    expect(planFondo(ym)).toBe(f);
  });

  it('aguinaldo en diciembre; prima no aplica al mes de inicio', () => {
    expect(extras(model, I('2026-12'))).toBe(38000);
    expect(extras(model, I('2027-07'))).toBe(45000);
    const julio = mk([], { mesInicio: '2026-07' });
    expect(extras(julio, I('2026-07'))).toBe(0);
  });

  it('necesita(9) en mayo 2027 = 359,376', () => {
    expect(necesita(model, I('2027-05'), 9)).toBe(359376);
  });

  it('fechas de colchón según el plan', () => {
    const f = (n) => fecha(fechaEscenario(model, 'plan', (m) => necesita(model, m, n), { ignoreClosings: true }));
    expect(f(6)).toBe('2027-01');
    expect(f(9)).toBe('2027-05');
    expect(f(12)).toBe('2027-07');
    expect(fecha(fechaEscenario(model, 'plan', (m) => necesitaDoble(model, m), { ignoreClosings: true }))).toBe('2027-07');
  });

  it('con viajes en pausa: 6 en dic 2026, 9 en feb 2027, 12 en abr 2027', () => {
    const p = mk([], { viajesEnPausa: true });
    const f = (n) => fecha(fechaEscenario(p, 'plan', (m) => necesita(p, m, n), { ignoreClosings: true }));
    expect(f(6)).toBe('2026-12');
    expect(f(9)).toBe('2027-02');
    expect(f(12)).toBe('2027-04');
  });
});

describe('con cierres de oct y nov', () => {
  const model = mk(CIERRES);
  const nov = I('2026-11');

  it('fondo, reservado y libre', () => {
    expect(fondo(model, nov)).toBe(242000);
    expect(reservado(model, nov)).toBe(84000);
    expect(libre(model, nov)).toBe(158000);
  });

  it('meses cubiertos', () => {
    expect(mesesCubiertos(model, nov, 158000)).toBeCloseTo(3.6, 1);
    expect(mesesCubiertos(model, nov, 242000)).toBeCloseTo(5.6, 1);
  });

  it('desvío', () => {
    expect(Math.round(desvio(model))).toBe(2946);
  });

  it('necesita', () => {
    expect(necesita(model, I('2027-01'), 6)).toBe(249276);
    expect(necesita(model, I('2027-04'), 9)).toBe(361222);
    expect(necesita(model, I('2027-07'), 12)).toBe(476584);
    expect(necesitaDoble(model, I('2027-06'))).toBe(448730);
  });

  it('fechas a ritmo real', () => {
    const f = (req) => fecha(fechaEscenario(model, 'real', req));
    expect(f((m) => necesita(model, m, 6))).toBe('2027-01');
    expect(f((m) => necesita(model, m, 9))).toBe('2027-04');
    expect(f((m) => necesita(model, m, 12))).toBe('2027-07');
    expect(f((m) => necesitaDoble(model, m))).toBe('2027-06');
  });

  it('según el plan original, 9 meses en mayo 2027', () => {
    const f = fechaEscenario(model, 'plan', (m) => necesita(model, m, 9), { ignoreClosings: true });
    expect(idxToYm(f.mes)).toBe('2027-05');
  });

  it('puente directo con libre de hoy', () => {
    const p = puenteDirecto(model, nov, 158000);
    expect(p.meses).toBe(17);
    expect(p.sostenible).toBe(false);
    expect(p.diffPrimerMes).toBe(12946);
  });
});

describe('estados límite', () => {
  it('"Hoy" cuando ya se cumple', () => {
    const rico = mk([{ month: '2026-10', ahorrado: 900000, retiros: 0 }]);
    expect(fechaEscenario(rico, 'real', (m) => necesita(rico, m, 6)).tipo).toBe('hoy');
  });

  it('"Sin fecha" si no se alcanza en el horizonte', () => {
    const pobre = mk([], { ingresoNeto: 30000 });
    expect(fechaEscenario(pobre, 'plan', (m) => necesita(pobre, m, 12)).tipo).toBe('sin');
  });
});

describe('plazosFromPlans', () => {
  it('suma cuotas por mes e ignora canceladas', () => {
    const plans = [
      { status: 'active', monthly_amount: 100, start_month: 11, start_year: 2026, total_months: 3,
        transactions: [{ billing_year: 2027, billing_month: 1, installment_status: 'cancelled' }] },
      { status: 'cancelled', monthly_amount: 999, start_month: 1, start_year: 2026, total_months: 12, transactions: [] },
    ];
    expect(plazosFromPlans(plans)).toEqual({ '2026-11': 100, '2026-12': 100 });
  });
});

describe('buildView', () => {
  it('con cierres: valores del mockup', () => {
    const v = buildView(mk(CIERRES));
    expect(v.libreHoy).toBe(158000);
    expect(v.reservadoHoy).toBe(84000);
    expect(idxToYm(v.metaMes)).toBe('2027-04');
    expect(idxToYm(v.metaMesPlan)).toBe('2027-05');
    expect(v.mesesAntes).toBe(1);
    expect(v.mesesFaltan).toBe(5);
    expect(v.indicadores.contraPlan).toBe(5892);
    expect(v.indicadores.planFondoHoy).toBe(236108);
    expect(v.indicadores.promReal).toBe(33150);
    expect(v.indicadores.promPlan).toBe(30204);
    expect(v.escenarios.map((e) => e.necesitas)).toEqual([249276, 361222, 476584, 448730]);
    expect(v.escenarios.map((e) => e.teFalta)).toEqual([91276, 203222, 318584, 290730]);
    expect(v.escenarios.map((e) => e.estado)).toEqual(['camino', 'meta', 'camino', 'camino']);
    expect(v.puente.estado).toBe('posible');
    expect(v.siguiente).toBe(I('2026-12'));
    expect(v.planSiguiente).toBe(70054);
    expect(v.comprasAMeses).toBe(0);
  });

  it('sin cierres: muestra el plan y el siguiente mes es el de inicio', () => {
    const v = buildView(mk());
    expect(v.hayCierres).toBe(false);
    expect(v.siguiente).toBe(I('2026-10'));
    expect(v.fondoHoy).toBe(205700);
    expect(v.indicadores.contraPlan).toBe(0);
    expect(idxToYm(v.metaMes)).toBe('2027-05');
    expect(v.mesesAntes).toBe(0);
    expect(v.barras[0].futuro).toBe(true);
  });
});
