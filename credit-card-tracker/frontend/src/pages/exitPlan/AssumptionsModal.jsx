import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal, Input, Select, Button } from '@/components/ui';
import { parseMoney } from './format';

const CAMPOS = [
  ['ingresoNeto', 'Ingreso neto mensual'],
  ['gastoBase', 'Gasto base mensual (fuera de plazos)'],
  ['mesNormal', 'Mes normal sin viajes ni compras (fuera de plazos)'],
  ['seguroMedico', 'Seguro médico (en meses sin ingreso)'],
  ['aguinaldo', 'Aguinaldo (diciembre)'],
  ['primaVacacional', 'Prima vacacional'],
  ['sueldoPiso', 'Sueldo piso (el peor que aceptarías)'],
  ['saldoInicial', 'Saldo inicial del fondo'],
  ['retiroInicial', 'Retiro inicial (liquidación del préstamo)'],
];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AssumptionsModal({ isOpen, cfg, plazosFuente, onSave, onClose }) {
  const [form, setForm] = useState(() => toForm(cfg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setRetiro = (i, k, v) => setForm((f) => ({ ...f, retiros: f.retiros.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));

  const submit = async (e) => {
    e.preventDefault();
    const out = { ...cfg, mesInicio: form.mesInicio, mesPrima: Number(form.mesPrima) };
    for (const [k, label] of CAMPOS) {
      const n = parseMoney(form[k]);
      if (n == null || n < 0) return setError(`"${label}" debe ser un monto válido.`);
      out[k] = n;
    }
    if (!/^\d{4}-\d{2}$/.test(form.mesInicio)) return setError('Elige el mes de inicio.');
    const retiros = [];
    for (const r of form.retiros) {
      const amount = parseMoney(r.amount);
      if (!r.month || amount == null || amount <= 0) return setError('Cada retiro planeado necesita mes y un monto mayor a 0.');
      retiros.push({ month: r.month, amount, label: r.label.trim() });
    }
    out.retirosPlaneados = retiros;
    setSaving(true);
    setError(null);
    try {
      await onSave(out);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los supuestos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar supuestos">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Mes de inicio" type="month" value={form.mesInicio} onChange={(e) => set('mesInicio', e.target.value)} />
          <Select label="Mes de la prima vacacional" value={form.mesPrima} onChange={(e) => set('mesPrima', e.target.value)}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          {CAMPOS.map(([k, label]) => (
            <Input key={k} label={label} type="text" inputMode="numeric" value={form[k]} onChange={(e) => set(k, e.target.value)} />
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-1">Retiros planeados</legend>
          {form.retiros.length === 0 && <p className="text-sm text-muted-foreground">Sin retiros planeados.</p>}
          {form.retiros.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[9rem_7rem_1fr_auto] gap-2 items-center">
              <input aria-label="Mes del retiro" type="month" value={r.month} onChange={(e) => setRetiro(i, 'month', e.target.value)} className="border-2 border-black px-2 py-2 min-h-[44px] bg-white" />
              <input aria-label="Monto del retiro" inputMode="numeric" placeholder="$0" value={r.amount} onChange={(e) => setRetiro(i, 'amount', e.target.value)} className="border-2 border-black px-2 py-2 min-h-[44px] bg-white" />
              <input aria-label="Concepto del retiro" placeholder="Concepto" value={r.label} onChange={(e) => setRetiro(i, 'label', e.target.value)} className="col-span-3 sm:col-span-1 border-2 border-black px-2 py-2 min-h-[44px] bg-white order-last sm:order-none" />
              <button type="button" aria-label="Quitar retiro" onClick={() => set('retiros', form.retiros.filter((_, j) => j !== i))} className="border-2 border-black p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white hover:bg-accent"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          ))}
          <button type="button" onClick={() => set('retiros', [...form.retiros, { month: '', amount: '', label: '' }])} className="inline-flex items-center gap-1.5 border-2 border-black px-3 py-2 min-h-[44px] text-sm font-medium bg-white hover:bg-accent">
            <Plus className="h-4 w-4" aria-hidden="true" />Agregar retiro
          </button>
        </fieldset>

        <p className="text-xs text-muted-foreground">Plazos comprometidos: {plazosFuente}. La meta y los viajes en pausa se cambian desde la pantalla principal.</p>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function toForm(cfg) {
  const f = { mesInicio: cfg.mesInicio, mesPrima: String(cfg.mesPrima) };
  for (const [k] of CAMPOS) f[k] = String(cfg[k]);
  f.retiros = cfg.retirosPlaneados.map((r) => ({ month: r.month, amount: String(r.amount), label: r.label || '' }));
  return f;
}
