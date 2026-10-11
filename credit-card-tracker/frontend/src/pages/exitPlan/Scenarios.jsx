import { mxn, fechaTexto, mesCorto } from './format';

const th = 'px-3 py-2.5 font-bold';
const badge = 'border-2 border-black px-2 py-0.5 text-xs font-bold whitespace-nowrap';

function Estado({ estado }) {
  const map = {
    listo: ['Listo', 'bg-[#0FDB6B]'],
    meta: ['Tu meta', 'bg-primary'],
    camino: ['En camino', 'bg-white'],
    sin: ['Sin fecha', 'bg-[#FF6B6B]'],
    posible: ['Posible hoy', 'bg-[#0FDB6B]'],
    'aun-no': ['Aún no', 'bg-white'],
  };
  const [txt, cls] = map[estado];
  return <span className={`${badge} ${cls}`}>{txt}</span>;
}

function mesesTexto(p) {
  if (p.sostenible) return 'sin límite';
  return `${p.meses} ${p.meses === 1 ? 'mes' : 'meses'}`;
}

export default function Scenarios({ view, cfg }) {
  const { puente } = view;
  const metaTxt = puente.meta
    ? puente.meta.sostenible
      ? ' En la fecha meta la cubre sin límite.'
      : ` En la fecha meta la cubre ${mesesTexto(puente.meta)}${puente.meta.meses >= 24 ? ` (${(puente.meta.meses / 12).toFixed(1)} años)` : ''}.`
    : '';

  return (
    <section aria-labelledby="t-esc" className="bg-white border-2 border-black shadow-md">
      <div className="border-b-2 border-black px-4 py-2.5">
        <h2 id="t-esc" className="text-[13px] font-bold tracking-wider uppercase">Escenarios</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13.5px] tabular-nums">
          <thead>
            <tr className="text-left text-[10.5px] tracking-widest uppercase text-muted-foreground">
              <th scope="col" className={`${th} px-4`}>Escenario</th>
              <th scope="col" className={`${th} text-right`}>Necesitas</th>
              <th scope="col" className={`${th} text-right`}>Te falta</th>
              <th scope="col" className={th}>A tu ritmo</th>
              <th scope="col" className={th}>Según plan</th>
              <th scope="col" className={`${th} px-4`}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {view.escenarios.map((e) => (
              <tr key={e.key} className={e.esMeta ? 'border-y-2 border-black bg-[#FFF6C2]' : 'border-t border-[#C9CCD2]'}>
                <td className="px-4 py-3"><b>{e.titulo}</b><br /><span className="text-muted-foreground text-[12.5px]">{e.detalle}</span></td>
                <td className="px-3 py-3 text-right">{mxn(e.necesitas)}</td>
                <td className="px-3 py-3 text-right">{mxn(e.teFalta)}</td>
                <td className="px-3 py-3 font-bold">{fechaTexto(e.real)}</td>
                <td className="px-3 py-3">{fechaTexto(e.plan)}</td>
                <td className="px-4 py-3"><Estado estado={e.estado} /></td>
              </tr>
            ))}
            <tr className="border-t border-[#C9CCD2]">
              <td className="px-4 py-3">
                <b>Cambio directo a un trabajo de {mxn(cfg.sueldoPiso)}</b><br />
                <span className="text-muted-foreground text-[12.5px]">
                  {puente.hoy.diffPrimerMes > 0 ? `te faltarían ${mxn(puente.hoy.diffPrimerMes)} al mes` : 'ya cubre tus gastos'}
                </span>
              </td>
              <td colSpan={4} className="px-3 py-3">
                Con lo que tienes hoy, el fondo cubre la diferencia <b>{mesesTexto(puente.hoy)}</b>.{metaTxt}
              </td>
              <td className="px-4 py-3"><Estado estado={puente.estado} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
