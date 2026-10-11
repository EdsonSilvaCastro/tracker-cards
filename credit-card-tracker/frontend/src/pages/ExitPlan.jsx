import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/retroui/Button';
import { exitPlanApi, installmentPlansApi } from '@/lib/api';
import {
  DEFAULT_CONFIG, SEED_PLAZOS, plazosFromPlans, buildView, ymToIdx,
} from '@/lib/exitPlan';
import Hero from './exitPlan/Hero';
import Indicators from './exitPlan/Indicators';
import ClosingForm from './exitPlan/ClosingForm';
import RealVsPlanChart from './exitPlan/RealVsPlanChart';
import Scenarios from './exitPlan/Scenarios';
import ClosingsHistory from './exitPlan/ClosingsHistory';
import AssumptionsModal from './exitPlan/AssumptionsModal';
import EditClosingModal from './exitPlan/EditClosingModal';
import { mesLargo, idxToYm, ymLargo } from './exitPlan/format';

const byMonth = (a, b) => ymToIdx(a.month) - ymToIdx(b.month);

// Usa los plazos de Monthly Payments si hay alguno vigente desde el mes de inicio; si no, la semilla.
function resolverPlazos(plans, mesInicio) {
  const app = plazosFromPlans(plans);
  const hayVigentes = Object.keys(app).some((ym) => ymToIdx(ym) >= ymToIdx(mesInicio));
  return hayVigentes
    ? { plazos: app, fuente: 'leídos de Monthly Payments' }
    : { plazos: SEED_PLAZOS, fuente: 'valores semilla (no hay pagos a meses vigentes en Monthly Payments)' };
}

export default function ExitPlan() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [closings, setClosings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ep, ip] = await Promise.all([exitPlanApi.get(), installmentPlansApi.getAll()]);
        if (cancelled) return;
        const data = ep.data.data;
        if (data.config) setCfg(data.config);
        setClosings(data.closings);
        setPlans(ip.data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'No se pudo cargar el plan de salida.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { plazos, fuente } = useMemo(() => resolverPlazos(plans, cfg.mesInicio), [plans, cfg.mesInicio]);
  const model = useMemo(() => ({ cfg, plazos, closings }), [cfg, plazos, closings]);
  const view = useMemo(() => buildView(model), [model]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveConfig = useCallback(async (next) => {
    const res = await exitPlanApi.saveConfig(next);
    setCfg(res.data.data);
  }, []);

  // Meta y viajes en pausa: se aplican al instante y se guardan; si falla, se revierte.
  const quickConfig = async (patch) => {
    const prev = cfg;
    setCfg({ ...cfg, ...patch });
    try {
      await saveConfig({ ...cfg, ...patch });
    } catch (err) {
      setCfg(prev);
      flash(err.response?.data?.error || 'No se pudo guardar el cambio.');
    }
  };

  const createClosing = async (payload) => {
    const res = await exitPlanApi.createClosing(payload);
    setClosings((cs) => [...cs, res.data.data].sort(byMonth));
    flash('Cierre guardado.');
  };

  const updateClosing = async (id, payload) => {
    const res = await exitPlanApi.updateClosing(id, payload);
    setClosings((cs) => cs.map((c) => (c.id === id ? res.data.data : c)).sort(byMonth));
    flash('Cierre actualizado.');
  };

  const deleteClosing = async (closing) => {
    try {
      await exitPlanApi.deleteClosing(closing.id);
      setClosings((cs) => cs.filter((c) => c.id !== closing.id));
      flash('Cierre borrado.');
    } catch (err) {
      flash(err.response?.data?.error || 'No se pudo borrar el cierre.');
    }
  };

  const irAlFormulario = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Cargando">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    );
  }
  if (error) {
    return <div role="alert" className="border-2 border-black bg-[#FF6B6B] shadow-md p-4 font-medium">{error}</div>;
  }

  const ultimo = closings.length ? closings[closings.length - 1] : null;
  const retirosMes = cfg.retirosPlaneados.filter((r) => r.month === idxToYm(view.siguiente));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap gap-3 justify-between items-end">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">Plan de salida</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {ultimo ? `Último cierre: ${ymLargo(ultimo.month).toLowerCase()} · ${closings.length} ${closings.length === 1 ? 'mes registrado' : 'meses registrados'}` : 'Aún sin cierres'}
            {' · solo cuenta dinero aportado, sin rendimientos'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-white min-h-[44px]" onClick={() => setShowAssumptions(true)}>Editar supuestos</Button>
          <Button variant="secondary" className="min-h-[44px]" onClick={irAlFormulario}>Registrar cierre de mes</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <div className="flex items-center gap-2" role="group" aria-label="Meta de meses sin ingreso">
          <span className="font-bold">Meta</span>
          {[6, 9, 12].map((n) => (
            <button
              key={n} type="button" aria-pressed={cfg.metaMeses === n}
              onClick={() => cfg.metaMeses !== n && quickConfig({ metaMeses: n })}
              className={`border-2 border-black px-3 py-2 min-h-[44px] min-w-[44px] font-bold ${cfg.metaMeses === n ? 'bg-primary shadow-sm' : 'bg-white hover:bg-accent'}`}
            >
              {n} meses
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox" checked={cfg.viajesEnPausa}
            onChange={(e) => quickConfig({ viajesEnPausa: e.target.checked })}
            className="w-[18px] h-[18px] accent-black"
          />
          Viajes en pausa mientras no haya ingreso
        </label>
      </div>

      {toast && <div role="status" className="border-2 border-black bg-[#0FDB6B] px-4 py-2 text-sm font-medium shadow-sm self-start">{toast}</div>}

      {!view.hayCierres && (
        <div className="border-2 border-black bg-white shadow-md p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold">Todavía no registras ningún cierre</div>
            <p className="text-sm text-muted-foreground">Lo que ves es el plan puro. Registra {mesLargo(view.siguiente).toLowerCase()} para ver tu ritmo real.</p>
          </div>
          <Button className="min-h-[44px]" onClick={irAlFormulario}>Registrar el primer mes</Button>
        </div>
      )}

      <Hero view={view} cfg={cfg} mesInicioLabel={mesLargo(ymToIdx(cfg.mesInicio)).toLowerCase()} />
      <Indicators view={view} />

      <div className="flex flex-wrap gap-4 items-stretch">
        <ClosingForm key={view.siguiente} view={view} cfg={cfg} retirosMes={retirosMes} onSave={createClosing} formRef={formRef} />
        <RealVsPlanChart view={view} />
      </div>

      <Scenarios view={view} cfg={cfg} />
      <ClosingsHistory view={view} onEdit={setEditing} onDelete={deleteClosing} />

      {showAssumptions && (
        <AssumptionsModal isOpen cfg={cfg} plazosFuente={fuente} onSave={saveConfig} onClose={() => setShowAssumptions(false)} />
      )}
      {editing && <EditClosingModal closing={editing} onSave={updateClosing} onClose={() => setEditing(null)} />}
    </div>
  );
}
