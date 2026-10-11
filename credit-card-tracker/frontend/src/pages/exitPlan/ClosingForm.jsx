import { useState } from 'react';
import ClosingFields, { EMPTY_CLOSING } from './ClosingFields';
import { Button } from '@/components/retroui/Button';
import { parseMoney, mesLargo, mxn, idxToYm } from './format';

export function closingPayload(month, v) {
  const ahorrado = parseMoney(v.ahorrado);
  if (ahorrado == null) return { error: 'Escribe cuánto ahorraste este mes (puede ser 0).' };
  const retiros = parseMoney(v.retiros) ?? 0;
  if (retiros < 0) return { error: 'Los retiros no pueden ser negativos.' };
  return { data: { month, ahorrado, retiros, huboViaje: v.huboViaje, abrioCompraAMeses: v.abrioCompraAMeses, nota: v.nota.trim() } };
}

export default function ClosingForm({ view, cfg, retirosMes, onSave, formRef }) {
  const [values, setValues] = useState(EMPTY_CLOSING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const month = view.siguiente;

  const extra = view.extrasSiguiente;
  const extraTxt = extra > 0 ? `, más ${mxn(extra)} de ${month % 12 === 11 ? 'aguinaldo' : 'prima vacacional'}` : '';
  const hintAhorro = `El plan pide ${mxn(view.ahorroPlanSiguiente)}${extraTxt}.`;
  const hintRetiro = retirosMes.length
    ? `El plan contempla ${retirosMes.map((r) => `${mxn(r.amount)} (${r.label || 'retiro'})`).join(' y ')}.`
    : 'Por ejemplo, pagos de un viaje.';

  const submit = async (e) => {
    e.preventDefault();
    const { data, error: invalid } = closingPayload(idxToYm(month), values);
    if (invalid) return setError(invalid);
    setSaving(true);
    setError(null);
    try {
      await onSave(data);
      setValues(EMPTY_CLOSING);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el cierre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section ref={formRef} aria-labelledby="t-cierre" className="flex-[1_1_320px] bg-white border-2 border-black shadow-md flex flex-col">
      <div className="bg-primary border-b-2 border-black px-4 py-2.5 flex justify-between items-center gap-2.5">
        <h2 id="t-cierre" className="text-[13px] font-bold tracking-wider uppercase">Cierre de {mesLargo(month).toLowerCase()}</h2>
        <div className="bg-black text-white px-2 py-0.5 text-xs font-bold">Pendiente</div>
      </div>
      <form onSubmit={submit} className="p-4 flex flex-col gap-3.5">
        <ClosingFields idPrefix="f" values={values} onChange={setValues} hintAhorro={hintAhorro} hintRetiro={hintRetiro} error={error} />
        <Button type="submit" disabled={saving} className="bg-[#0FDB6B] hover:bg-[#0FDB6B] text-black font-bold min-h-[44px]">
          {saving ? 'Guardando…' : 'Guardar cierre y recalcular'}
        </Button>
      </form>
    </section>
  );
}
