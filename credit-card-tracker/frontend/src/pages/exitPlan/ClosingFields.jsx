// Campos compartidos del cierre de mes (formulario principal y edición).
export const EMPTY_CLOSING = { ahorrado: '', retiros: '', huboViaje: false, abrioCompraAMeses: false, nota: '' };

const input = 'w-full border-2 border-black bg-white px-3 py-2.5 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default function ClosingFields({ idPrefix, values, onChange, hintAhorro, hintRetiro, error }) {
  const set = (k, v) => onChange({ ...values, [k]: v });
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-ahorro`} className="text-[13px] font-bold">¿Cuánto ahorraste este mes?</label>
        <input
          id={`${idPrefix}-ahorro`} type="text" inputMode="numeric" placeholder="$0"
          value={values.ahorrado} onChange={(e) => set('ahorrado', e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          className={`${input} text-[22px] font-bold`}
        />
        {hintAhorro && <div className="text-[12.5px] text-muted-foreground">{hintAhorro}</div>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-retiro`} className="text-[13px] font-bold">¿Sacaste algo del fondo?</label>
        <input
          id={`${idPrefix}-retiro`} type="text" inputMode="numeric" placeholder="$0"
          value={values.retiros} onChange={(e) => set('retiros', e.target.value)}
          className={`${input} text-base`}
        />
        {hintRetiro && <div className="text-[12.5px] text-muted-foreground">{hintRetiro}</div>}
      </div>
      <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-[13px]">
        <label htmlFor={`${idPrefix}-viaje`} className="flex items-center gap-2 min-h-[44px]">
          <input id={`${idPrefix}-viaje`} type="checkbox" checked={values.huboViaje} onChange={(e) => set('huboViaje', e.target.checked)} className="w-[18px] h-[18px] accent-black" />
          Hubo viaje este mes
        </label>
        <label htmlFor={`${idPrefix}-msi`} className="flex items-center gap-2 min-h-[44px]">
          <input id={`${idPrefix}-msi`} type="checkbox" checked={values.abrioCompraAMeses} onChange={(e) => set('abrioCompraAMeses', e.target.checked)} className="w-[18px] h-[18px] accent-black" />
          Abrí una compra a meses
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-nota`} className="text-[13px] font-bold">Nota</label>
        <input
          id={`${idPrefix}-nota`} type="text" placeholder="Opcional"
          value={values.nota} onChange={(e) => set('nota', e.target.value)}
          className={`${input} text-base`}
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
