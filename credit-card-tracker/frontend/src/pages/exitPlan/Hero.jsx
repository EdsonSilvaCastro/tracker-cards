import { mxn, mesLargo, plural } from './format';

const chip = 'border-2 border-black px-3 py-1.5 text-[13px] font-medium';

function titulo(view) {
  const f = view.meta.real;
  if (f.tipo === 'hoy') return 'Hoy';
  if (f.tipo === 'sin') return 'Sin fecha';
  return mesLargo(f.mes);
}

function descripcion(view, metaMeses) {
  const f = view.meta.real;
  const original = view.meta.plan;
  const ritmo = view.hayCierres ? 'A tu ritmo real' : 'Con el plan';
  const orig = original.tipo === 'fecha' ? `El plan original decía ${mesLargo(original.mes)}.` : original.tipo === 'hoy' ? 'El plan original ya lo cumplía.' : 'El plan original tampoco lo alcanza.';
  if (f.tipo === 'hoy') return `Tu fondo libre ya cubre ${metaMeses} meses sin ingreso.`;
  if (f.tipo === 'sin') return `${ritmo} no se alcanza a cubrir ${metaMeses} meses sin ingreso en los próximos 7 años. ${orig}`;
  const base = `${ritmo} faltan ${plural(view.mesesFaltan, 'mes', 'meses')} para cubrir ${metaMeses} meses sin ingreso.`;
  return view.hayCierres ? `${base} ${orig}` : base;
}

function comparacion(view) {
  const d = view.mesesAntes;
  if (d == null || !view.hayCierres) return null;
  if (d > 0) return { texto: `${plural(d, 'mes', 'meses')} antes del plan`, cls: 'bg-[#0FDB6B]' };
  if (d < 0) return { texto: `${plural(-d, 'mes', 'meses')} después del plan`, cls: 'bg-[#FF6B6B]' };
  return { texto: 'En línea con el plan', cls: 'bg-white' };
}

export default function Hero({ view, cfg, mesInicioLabel }) {
  const cmp = comparacion(view);
  const { libreHoy, reservadoHoy, escala, marcas, indicadores } = view;
  const pct = (n) => `${Math.min(100, Math.max(0, (n / escala) * 100))}%`;
  const reservadoPct = Math.min(100 - parseFloat(pct(libreHoy)), (reservadoHoy / escala) * 100);

  return (
    <section aria-label="Fecha de salida" className="bg-primary border-2 border-black shadow-lg p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-widest uppercase">Puedes salir sin oferta en</div>
          <div className="text-5xl sm:text-6xl font-bold leading-none mt-1.5 tracking-tight">{titulo(view)}</div>
          <p className="text-sm mt-2 max-w-[520px]">{descripcion(view, cfg.metaMeses)}</p>
        </div>
        <div className="flex flex-col gap-2 items-start">
          {cmp && <div className={`${chip} font-bold ${cmp.cls}`}>{cmp.texto}</div>}
          <div className={`${chip} bg-white`}>
            {plural(view.comprasAMeses, 'compra nueva a meses', 'compras nuevas a meses')} desde {mesInicioLabel}
          </div>
          {cfg.retiroInicial > 0 && <div className={`${chip} bg-white`}>Préstamo liquidado</div>}
        </div>
      </div>

      <div>
        <div
          className="relative h-[34px] bg-white border-2 border-black flex"
          role="img"
          aria-label={`Libre para la salida ${mxn(libreHoy)}, apartado ${mxn(reservadoHoy)}, de ${mxn(escala)}`}
        >
          <div className="bg-black" style={{ width: pct(libreHoy) }} />
          {reservadoHoy > 0 && (
            <div
              className="border-l-2 border-black"
              style={{ width: `${reservadoPct}%`, background: 'repeating-linear-gradient(135deg, #000 0 3px, #8A9BC4 3px 8px)' }}
            />
          )}
          {marcas.map((m) => (
            <div
              key={m.n}
              aria-hidden="true"
              className="absolute bg-black"
              style={{ left: pct(m.monto), top: m.esMeta ? -10 : -6, bottom: m.esMeta ? -10 : -6, width: m.esMeta ? 4 : 2, transform: 'translateX(-50%)' }}
            />
          ))}
        </div>

        <div className="sm:hidden flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
          {marcas.map((m) => (
            <div key={m.n} className={m.esMeta ? 'font-bold' : ''}>{m.esMeta ? `Meta: ${m.n} meses` : `${m.n} meses`} {mxn(m.monto)}</div>
          ))}
        </div>

        <div className="hidden sm:block relative h-10 mt-2.5 text-xs">
          {marcas.map((m, i) => {
            const ultimo = i === marcas.length - 1;
            return (
              <div
                key={m.n}
                className={`absolute text-center whitespace-nowrap ${m.esMeta ? 'font-bold' : ''}`}
                style={ultimo ? { right: 0, textAlign: 'right' } : { left: pct(m.monto), transform: 'translateX(-50%)' }}
              >
                {m.esMeta ? `Meta: ${m.n} meses` : `${m.n} meses`}<br />{mxn(m.monto)}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] mt-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block w-3.5 h-3.5 bg-black" />
            Libre para la salida <b>{mxn(libreHoy)}</b>
          </div>
          {reservadoHoy > 0 && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block w-3.5 h-3.5 border-2 border-black" style={{ background: 'repeating-linear-gradient(135deg, #000 0 2px, #8A9BC4 2px 5px)' }} />
              Apartado para retiros planeados <b>{mxn(reservadoHoy)}</b>
            </div>
          )}
          <div>Fondo contado <b>{mxn(indicadores.fondoContado)}</b></div>
        </div>
      </div>
    </section>
  );
}
