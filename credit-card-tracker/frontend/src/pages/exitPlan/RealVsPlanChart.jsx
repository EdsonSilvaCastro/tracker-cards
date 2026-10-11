import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList, Tooltip } from 'recharts';
import { mxn, mxnK, mesAbrev, mesLargo } from './format';

function Tick({ x, y, payload, byLabel }) {
  const b = byLabel[payload.value];
  return (
    <g transform={`translate(${x},${y})`}>
      {b?.esMeta && <rect x={-18} y={2} width={36} height={20} fill="#FFDD2D" />}
      <text y={16} textAnchor="middle" fontSize={12} fontWeight={b && !b.futuro ? 700 : 400}>{payload.value}</text>
    </g>
  );
}

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border-2 border-black px-3 py-2 text-xs shadow-sm">
      <div className="font-bold mb-1">{d.titulo}</div>
      <div>{d.futuro ? 'Proyectado a tu ritmo' : 'Real'}: {mxn(d.real)}</div>
      <div>Plan: {mxn(d.plan)}</div>
    </div>
  );
}

export default function RealVsPlanChart({ view }) {
  const data = view.barras.map((b) => ({
    ...b,
    label: mesAbrev(b.m),
    titulo: mesLargo(b.m),
  }));
  const byLabel = Object.fromEntries(data.map((d) => [d.label, d]));
  const resumen = data.map((d) => `${d.titulo}: ${d.futuro ? 'proyectado' : 'real'} ${mxn(d.real)}, plan ${mxn(d.plan)}`).join('. ');
  const ancho = Math.max(data.length * 60, 320);

  return (
    <section aria-labelledby="t-ritmo" className="flex-[2_1_460px] min-w-0 bg-white border-2 border-black shadow-md flex flex-col">
      <div className="border-b-2 border-black px-4 py-2.5 flex flex-wrap justify-between items-center gap-2.5">
        <h2 id="t-ritmo" className="text-[13px] font-bold tracking-wider uppercase">Ahorro por mes: real contra plan</h2>
        <div className="flex gap-3.5 text-[12.5px]">
          <div className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 bg-black" />Real</div>
          <div className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 border-2 border-black bg-white" />Plan</div>
          <div className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 border-2 border-dashed border-[#8A8F98] bg-white" />Proyectado</div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-2 pt-4 pb-2" role="img" aria-label={`Barras de ahorro mensual. ${resumen}`}>
        <div style={{ minWidth: ancho, height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 18, right: 8, left: 8, bottom: 0 }} barGap={4}>
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} tick={<Tick byLabel={byLabel} />} interval={0} />
              <YAxis hide domain={[0, 'dataMax']} />
              <Tooltip content={<Tip />} cursor={false} />
              <Bar dataKey="real" isAnimationActive={false} maxBarSize={22}>
                {data.map((d) => (
                  <Cell key={d.m} fill={d.futuro ? '#fff' : '#000'} stroke={d.futuro ? '#8A8F98' : '#000'} strokeWidth={2} strokeDasharray={d.futuro ? '4 3' : undefined} />
                ))}
                <LabelList dataKey="real" position="top" formatter={mxnK} fontSize={12} stroke="none" fill="#111" />
              </Bar>
              <Bar dataKey="plan" isAnimationActive={false} maxBarSize={22} fill="#fff" stroke="#000" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="border-t-2 border-black px-4 py-2.5 text-[12.5px] text-muted-foreground">
        {view.hayCierres
          ? 'Los meses sin cierre se proyectan con tu promedio real.'
          : 'Sin cierres: las barras punteadas siguen el plan.'}
        {view.metaMes != null && <> {mesLargo(view.metaMes).split(' ')[0]}, en amarillo, es el mes en que alcanzas la meta.</>}
      </div>
    </section>
  );
}
