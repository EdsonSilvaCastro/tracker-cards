// Plan de salida — matemática pura, sin dependencias de UI.
// Solo cuenta dinero aportado: saldo inicial + aportaciones − retiros.
//
// Un mes se representa como índice entero (año*12 + mes-1) dentro de los cálculos
// y como 'YYYY-MM' en los datos que se guardan.

export const HORIZONTE_MESES = 84;
// Meses de diferencia cubiertos con el fondo para marcar "Posible hoy" en el cambio directo.
export const PUENTE_MIN_MESES = 12;

// ── Meses ────────────────────────────────────────────────────────────────────

export const ymToIdx = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

export const idxToYm = (idx) => {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const idxMonth = (idx) => (idx % 12) + 1;

// ── Valores iniciales ────────────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  mesInicio: '2026-10',
  saldoInicial: 232000,
  retiroInicial: 26300,
  ingresoNeto: 75000,
  gastoBase: 37500,
  mesNormal: 25000,
  seguroMedico: 2000,
  aguinaldo: 38000,
  primaVacacional: 45000,
  mesPrima: 7,
  sueldoPiso: 30000,
  metaMeses: 9,
  viajesEnPausa: false,
  retirosPlaneados: [
    { month: '2026-11', amount: 30000, label: 'Vuelos Japón' },
    { month: '2027-03', amount: 84000, label: 'Viaje Japón' },
  ],
};

// Semilla de plazos comprometidos (ya sin el préstamo), por mes 'YYYY-MM'.
export const SEED_PLAZOS = (() => {
  const out = {};
  const set = (from, to, amount) => {
    for (let i = ymToIdx(from); i <= ymToIdx(to); i++) out[idxToYm(i)] = amount;
  };
  set('2026-10', '2026-10', 8146);
  set('2026-11', '2026-11', 6446);
  set('2026-12', '2026-12', 5446);
  set('2027-01', '2027-01', 4346);
  set('2027-02', '2027-03', 3646);
  set('2027-04', '2027-05', 1846);
  set('2027-06', '2027-11', 646);
  return out;
})();

// Suma de cuotas por mes a partir de los planes a meses de la app.
// plans: respuesta de GET /installment-plans (con `transactions`).
export const plazosFromPlans = (plans) => {
  const out = {};
  for (const p of plans || []) {
    if (p.status === 'cancelled') continue;
    const txs = p.transactions || [];
    for (let i = 0; i < p.total_months; i++) {
      const idx = p.start_year * 12 + (p.start_month - 1) + i;
      const ym = idxToYm(idx);
      const tx = txs.find((t) => t.billing_year * 12 + (t.billing_month - 1) === idx);
      if (tx?.installment_status === 'cancelled') continue;
      out[ym] = (out[ym] || 0) + Number(p.monthly_amount);
    }
  }
  return out;
};

// ── Costos y ahorro del plan ─────────────────────────────────────────────────
// model = { cfg, plazos: { 'YYYY-MM': monto }, closings: [{ month, ahorrado, retiros, ... }] }

export const plazos = (model, m) => model.plazos[idxToYm(m)] || 0;

export const costo = (model, m) => model.cfg.gastoBase + plazos(model, m);

export const ahorroPlan = (model, m) => model.cfg.ingresoNeto - costo(model, m);

export const extras = (model, m) => {
  const { cfg } = model;
  let total = 0;
  if (idxMonth(m) === 12) total += cfg.aguinaldo;
  if (idxMonth(m) === cfg.mesPrima && m !== ymToIdx(cfg.mesInicio)) total += cfg.primaVacacional;
  return total;
};

export const planTotal = (model, m) => ahorroPlan(model, m) + extras(model, m);

// ── Fondo ────────────────────────────────────────────────────────────────────

const fondoBase = (cfg) => cfg.saldoInicial - cfg.retiroInicial;

const sortedClosings = (model) =>
  [...model.closings].sort((a, b) => ymToIdx(a.month) - ymToIdx(b.month));

export const lastClosingIdx = (model) => {
  const cs = sortedClosings(model);
  return cs.length ? ymToIdx(cs[cs.length - 1].month) : null;
};

// Fondo contado al cierre de m, solo con cierres registrados.
export const fondo = (model, m) =>
  model.closings
    .filter((c) => ymToIdx(c.month) <= m)
    .reduce((acc, c) => acc + c.ahorrado - c.retiros, fondoBase(model.cfg));

// Retiros planeados posteriores a m que aún no se registran en un cierre.
export const reservado = (model, m) => {
  const closed = new Set(model.closings.map((c) => c.month));
  return model.cfg.retirosPlaneados
    .filter((r) => ymToIdx(r.month) > m && !closed.has(r.month))
    .reduce((acc, r) => acc + r.amount, 0);
};

export const libre = (model, m) => fondo(model, m) - reservado(model, m);

// ── Cuánto se necesita sin ingreso ───────────────────────────────────────────

export const costoSinIngreso = (model, m) => {
  const { cfg } = model;
  const c = costo(model, m);
  const base = cfg.viajesEnPausa ? Math.min(c, cfg.mesNormal + plazos(model, m)) : c;
  return base + cfg.seguroMedico;
};

export const necesita = (model, m, n) => {
  let total = 0;
  for (let k = 1; k <= n; k++) total += costoSinIngreso(model, m + k);
  return total;
};

// Meses seguidos que paga x, con fracción en el último.
export const mesesCubiertos = (model, m, x) => {
  let restante = x;
  let meses = 0;
  for (let k = 1; k <= 600; k++) {
    const c = costoSinIngreso(model, m + k);
    if (restante >= c) {
      restante -= c;
      meses += 1;
    } else {
      return meses + Math.max(0, restante) / c;
    }
  }
  return meses;
};

export const necesitaDoble = (model, m) => {
  let total = necesita(model, m, 9);
  for (let k = 10; k <= 21; k++) {
    total += Math.max(0, costo(model, m + k) - model.cfg.sueldoPiso);
  }
  return total;
};

// Cambio directo a un trabajo de sueldoPiso: el fondo paga la diferencia mes a mes.
export const puenteDirecto = (model, m, x) => {
  const piso = model.cfg.sueldoPiso;
  const diffPrimerMes = Math.max(0, costo(model, m + 1) - piso);
  let restante = x;
  let meses = 0;
  for (let k = 1; k <= 600; k++) {
    const d = Math.max(0, costo(model, m + k) - piso);
    if (d === 0) return { meses: Infinity, sostenible: true, diffPrimerMes };
    if (restante < d) break;
    restante -= d;
    meses += 1;
  }
  return { meses, sostenible: false, diffPrimerMes };
};

// ── Ritmo real ───────────────────────────────────────────────────────────────

// Promedio de (ahorrado − planTotal) de los últimos 3 cierres.
export const desvio = (model) => {
  const ultimos = sortedClosings(model).slice(-3);
  if (!ultimos.length) return 0;
  const suma = ultimos.reduce((acc, c) => acc + (c.ahorrado - planTotal(model, ymToIdx(c.month))), 0);
  return suma / ultimos.length;
};

// ── Proyección ───────────────────────────────────────────────────────────────

// Devuelve [{ m, fondo, libre }] para cada mes después del último cierre
// (o desde mesInicio si no hay cierres), hasta el horizonte.
// ritmo: 'plan' | 'real'. Con ignoreClosings se proyecta el plan original desde el inicio.
export const proyectar = (model, ritmo, { ignoreClosings = false } = {}) => {
  const base = ignoreClosings ? { ...model, closings: [] } : model;
  const last = lastClosingIdx(base);
  const start = last ?? ymToIdx(base.cfg.mesInicio) - 1;
  const aporteExtra = ritmo === 'real' ? desvio(base) : 0;
  const retiros = {};
  for (const r of base.cfg.retirosPlaneados) retiros[r.month] = (retiros[r.month] || 0) + r.amount;

  let saldo = fondo(base, start);
  const out = [];
  for (let i = 1; i <= HORIZONTE_MESES; i++) {
    const m = start + i;
    saldo += planTotal(base, m) + aporteExtra - (retiros[idxToYm(m)] || 0);
    // reservado aquí se mide contra el calendario de retiros planeados, no contra cierres
    const reserv = base.cfg.retirosPlaneados
      .filter((r) => ymToIdx(r.month) > m)
      .reduce((acc, r) => acc + r.amount, 0);
    out.push({ m, fondo: saldo, libre: saldo - reserv });
  }
  return { start, puntos: out };
};

// Fecha de un escenario: primer mes en que libre >= requerido(m) y se mantiene.
// requerido: (m) => monto. Devuelve { tipo: 'hoy' | 'fecha' | 'sin', mes? }.
export const fechaEscenario = (model, ritmo, requerido, opts) => {
  const { start, puntos } = proyectar(model, ritmo, opts);
  const base = opts?.ignoreClosings ? { ...model, closings: [] } : model;
  const cumple = (m, libreM) => libreM >= requerido(m);

  const hoyLibre = libre(base, start);
  const todos = [{ m: start, libre: hoyLibre }, ...puntos];

  let primero = -1;
  for (let i = todos.length - 1; i >= 0; i--) {
    if (cumple(todos[i].m, todos[i].libre)) primero = i;
    else break;
  }
  if (primero === -1) return { tipo: 'sin' };
  if (primero === 0) return { tipo: 'hoy', mes: start };
  return { tipo: 'fecha', mes: todos[primero].m };
};

// ── Vista derivada ───────────────────────────────────────────────────────────

const libreProyectado = (model, ritmo, m, opts) => {
  const { start, puntos } = proyectar(model, ritmo, opts);
  if (m === start) return libre(opts?.ignoreClosings ? { ...model, closings: [] } : model, start);
  return puntos.find((p) => p.m === m)?.libre ?? null;
};

const mesDeFecha = (f) => (f.tipo === 'sin' ? null : f.mes);

// Todo lo que pinta la pantalla, calculado a partir del modelo.
export const buildView = (model) => {
  const { cfg } = model;
  const cierres = sortedClosings(model);
  const last = lastClosingIdx(model);
  const inicio = ymToIdx(cfg.mesInicio);
  const hoy = last ?? inicio - 1;

  const fondoHoy = fondo(model, hoy);
  const reservadoHoy = reservado(model, hoy);
  const libreHoy = fondoHoy - reservadoHoy;
  const desv = desvio(model);

  // Escenarios de colchón y caso doble
  const defs = [
    { key: '6', n: 6, titulo: 'Colchón de 6 meses', detalle: 'sin ingreso, vida completa', req: (m) => necesita(model, m, 6) },
    { key: '9', n: 9, titulo: 'Colchón de 9 meses', detalle: 'una búsqueda larga', req: (m) => necesita(model, m, 9) },
    { key: '12', n: 12, titulo: 'Colchón de 12 meses', detalle: 'salida blindada', req: (m) => necesita(model, m, 12) },
    { key: 'doble', n: null, titulo: '9 meses sin ingreso y luego un año a ' + cfg.sueldoPiso.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }), detalle: 'peor caso doble', req: (m) => necesitaDoble(model, m) },
  ];
  const escenarios = defs.map((d) => {
    const real = fechaEscenario(model, 'real', d.req);
    const plan = fechaEscenario(model, 'plan', d.req, { ignoreClosings: true });
    const monto = d.req(mesDeFecha(real) ?? hoy);
    const esMeta = d.n === cfg.metaMeses;
    let estado = 'camino';
    if (real.tipo === 'hoy') estado = 'listo';
    else if (real.tipo === 'sin') estado = 'sin';
    else if (esMeta) estado = 'meta';
    return { ...d, real, plan, necesitas: monto, teFalta: Math.max(0, monto - libreHoy), esMeta, estado };
  });

  const meta = escenarios.find((e) => e.n === cfg.metaMeses);
  const metaMes = mesDeFecha(meta.real);
  const metaMesPlan = mesDeFecha(meta.plan);
  const mesesAntes = metaMes != null && metaMesPlan != null ? metaMesPlan - metaMes : null;
  const mesesFaltan = metaMes != null ? metaMes - hoy : null;

  // Cambio directo a un trabajo de sueldoPiso
  const puenteHoy = puenteDirecto(model, hoy, libreHoy);
  const libreEnMeta = metaMes != null ? libreProyectado(model, 'real', metaMes) : null;
  const puenteMeta = metaMes != null && libreEnMeta != null ? puenteDirecto(model, metaMes, libreEnMeta) : null;
  const puente = {
    hoy: puenteHoy,
    meta: puenteMeta,
    estado: puenteHoy.sostenible || puenteHoy.meses >= PUENTE_MIN_MESES ? 'posible' : 'aun-no',
  };

  // Barra de avance: marcas en el monto de cada colchón a su fecha
  const marcas = escenarios.filter((e) => e.n).map((e) => ({ n: e.n, monto: e.necesitas, esMeta: e.esMeta }));
  const escala = Math.max(...marcas.map((m) => m.monto), libreHoy + reservadoHoy, 1);

  // Indicadores
  const planProy = proyectar(model, 'plan', { ignoreClosings: true });
  const planFondoHoy = hoy === planProy.start
    ? fondo({ ...model, closings: [] }, planProy.start)
    : planProy.puntos.find((p) => p.m === hoy)?.fondo ?? null;
  const promReal = cierres.length ? cierres.reduce((a, c) => a + c.ahorrado, 0) / cierres.length : null;
  const promPlan = cierres.length ? cierres.reduce((a, c) => a + planTotal(model, ymToIdx(c.month)), 0) / cierres.length : null;

  // Gráfica real contra plan
  const finGrafica = (metaMes ?? metaMesPlan ?? inicio + 11) + 1;
  const barras = [];
  for (let m = inicio; m <= Math.max(finGrafica, inicio); m++) {
    const c = cierres.find((x) => ymToIdx(x.month) === m);
    const plan = planTotal(model, m);
    barras.push({ m, plan, real: c ? c.ahorrado : plan + desv, futuro: !c, esMeta: m === metaMes });
  }

  // Historial
  const filas = cierres.map((c) => {
    const m = ymToIdx(c.month);
    const plan = planTotal(model, m);
    return { ...c, m, plan, diferencia: c.ahorrado - plan, fondo: fondo(model, m) };
  });
  const siguiente = hoy + 1;

  return {
    hoy, siguiente, hayCierres: cierres.length > 0,
    fondoHoy, reservadoHoy, libreHoy, desvio: desv,
    escenarios, meta, metaMes, metaMesPlan, mesesAntes, mesesFaltan,
    puente, marcas, escala,
    indicadores: {
      fondoContado: fondoHoy,
      planFondoHoy,
      contraPlan: planFondoHoy == null ? null : fondoHoy - planFondoHoy,
      promReal, promPlan,
      mesesLibre: mesesCubiertos(model, hoy, libreHoy),
      mesesTodo: mesesCubiertos(model, hoy, fondoHoy),
    },
    comprasAMeses: cierres.filter((c) => c.abrioCompraAMeses).length,
    barras, filas,
    inicioFila: { retiro: cfg.retiroInicial, fondo: fondoBase(cfg), saldoInicial: cfg.saldoInicial },
    planSiguiente: planTotal(model, siguiente),
    extrasSiguiente: extras(model, siguiente),
    ahorroPlanSiguiente: ahorroPlan(model, siguiente),
  };
};
