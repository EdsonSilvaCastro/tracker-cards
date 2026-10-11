import { supabaseAdmin } from '../config/supabase.js';

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

// ─── mapping DB (snake_case) <-> API (camelCase) ─────────────────────────────

const configFromRow = (r) => ({
  mesInicio: r.mes_inicio,
  saldoInicial: Number(r.saldo_inicial),
  retiroInicial: Number(r.retiro_inicial),
  ingresoNeto: Number(r.ingreso_neto),
  gastoBase: Number(r.gasto_base),
  mesNormal: Number(r.mes_normal),
  seguroMedico: Number(r.seguro_medico),
  aguinaldo: Number(r.aguinaldo),
  primaVacacional: Number(r.prima_vacacional),
  mesPrima: r.mes_prima,
  sueldoPiso: Number(r.sueldo_piso),
  metaMeses: r.meta_meses,
  viajesEnPausa: r.viajes_en_pausa,
  retirosPlaneados: r.retiros_planeados || [],
});

const closingFromRow = (r) => ({
  id: r.id,
  month: r.month,
  ahorrado: Number(r.ahorrado),
  retiros: Number(r.retiros),
  huboViaje: r.hubo_viaje,
  abrioCompraAMeses: r.abrio_compra_a_meses,
  nota: r.nota || '',
});

const NUMERIC_FIELDS = [
  'saldoInicial', 'retiroInicial', 'ingresoNeto', 'gastoBase', 'mesNormal',
  'seguroMedico', 'aguinaldo', 'primaVacacional', 'sueldoPiso',
];

// Devuelve { error } o { row } listo para insertar/actualizar.
function validateConfig(b) {
  if (!YM.test(b.mesInicio || '')) return { error: 'mesInicio must be YYYY-MM' };
  for (const f of NUMERIC_FIELDS) {
    if (b[f] == null || !Number.isFinite(Number(b[f])) || Number(b[f]) < 0) {
      return { error: `${f} must be a non-negative number` };
    }
  }
  if (!Number.isInteger(Number(b.mesPrima)) || b.mesPrima < 1 || b.mesPrima > 12) {
    return { error: 'mesPrima must be between 1 and 12' };
  }
  if (![6, 9, 12].includes(Number(b.metaMeses))) {
    return { error: 'metaMeses must be 6, 9 or 12' };
  }
  const retiros = b.retirosPlaneados ?? [];
  if (!Array.isArray(retiros) || retiros.some((r) => !YM.test(r?.month || '') || !(Number(r.amount) > 0))) {
    return { error: 'retirosPlaneados must be a list of { month: YYYY-MM, amount > 0, label }' };
  }
  return {
    row: {
      mes_inicio: b.mesInicio,
      saldo_inicial: Number(b.saldoInicial),
      retiro_inicial: Number(b.retiroInicial),
      ingreso_neto: Number(b.ingresoNeto),
      gasto_base: Number(b.gastoBase),
      mes_normal: Number(b.mesNormal),
      seguro_medico: Number(b.seguroMedico),
      aguinaldo: Number(b.aguinaldo),
      prima_vacacional: Number(b.primaVacacional),
      mes_prima: Number(b.mesPrima),
      sueldo_piso: Number(b.sueldoPiso),
      meta_meses: Number(b.metaMeses),
      viajes_en_pausa: !!b.viajesEnPausa,
      retiros_planeados: retiros.map((r) => ({ month: r.month, amount: Number(r.amount), label: String(r.label || '') })),
    },
  };
}

function validateClosing(b) {
  if (!YM.test(b.month || '')) return { error: 'month must be YYYY-MM' };
  if (b.ahorrado == null || !Number.isFinite(Number(b.ahorrado))) return { error: 'ahorrado must be a number' };
  const retiros = Number(b.retiros ?? 0);
  if (!Number.isFinite(retiros) || retiros < 0) return { error: 'retiros must be a non-negative number' };
  return {
    row: {
      month: b.month,
      ahorrado: Number(b.ahorrado),
      retiros,
      hubo_viaje: !!b.huboViaje,
      abrio_compra_a_meses: !!b.abrioCompraAMeses,
      nota: b.nota ? String(b.nota) : null,
    },
  };
}

// ─── GET /api/exit-plan ──────────────────────────────────────────────────────
// config es null si el usuario aún no guardó supuestos (el frontend usa los valores iniciales).

export const getExitPlan = async (req, res) => {
  try {
    const [cfg, closings] = await Promise.all([
      supabaseAdmin.from('exit_plan_config').select('*').eq('user_id', req.user.id).maybeSingle(),
      supabaseAdmin.from('exit_plan_closings').select('*').eq('user_id', req.user.id).order('month', { ascending: true }),
    ]);
    if (cfg.error) throw cfg.error;
    if (closings.error) throw closings.error;

    res.json({
      success: true,
      data: {
        config: cfg.data ? configFromRow(cfg.data) : null,
        closings: (closings.data || []).map(closingFromRow),
      },
    });
  } catch (error) {
    console.error('Error fetching exit plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PUT /api/exit-plan/config (upsert) ──────────────────────────────────────

export const saveConfig = async (req, res) => {
  try {
    const { row, error: invalid } = validateConfig(req.body || {});
    if (invalid) return res.status(400).json({ success: false, error: invalid });

    const { data, error } = await supabaseAdmin
      .from('exit_plan_config')
      .upsert({ ...row, user_id: req.user.id }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;

    res.json({ success: true, data: configFromRow(data) });
  } catch (error) {
    console.error('Error saving exit plan config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── POST /api/exit-plan/closings ────────────────────────────────────────────

export const createClosing = async (req, res) => {
  try {
    const { row, error: invalid } = validateClosing(req.body || {});
    if (invalid) return res.status(400).json({ success: false, error: invalid });

    const { data, error } = await supabaseAdmin
      .from('exit_plan_closings')
      .insert({ ...row, user_id: req.user.id })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Ya existe un cierre para ese mes' });
      }
      throw error;
    }

    res.status(201).json({ success: true, data: closingFromRow(data) });
  } catch (error) {
    console.error('Error creating exit plan closing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PUT /api/exit-plan/closings/:id ─────────────────────────────────────────

export const updateClosing = async (req, res) => {
  try {
    const { row, error: invalid } = validateClosing(req.body || {});
    if (invalid) return res.status(400).json({ success: false, error: invalid });

    const { data, error } = await supabaseAdmin
      .from('exit_plan_closings')
      .update(row)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Ya existe un cierre para ese mes' });
      }
      throw error;
    }
    if (!data) return res.status(404).json({ success: false, error: 'Closing not found' });

    res.json({ success: true, data: closingFromRow(data) });
  } catch (error) {
    console.error('Error updating exit plan closing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE /api/exit-plan/closings/:id ──────────────────────────────────────

export const deleteClosing = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('exit_plan_closings')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ success: false, error: 'Closing not found' });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exit plan closing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
