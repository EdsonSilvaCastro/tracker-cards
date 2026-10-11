import { mxn, mxnSigned } from './format';

function Tile({ label, value, sub, className = 'bg-white', subMuted = true }) {
  return (
    <div className={`flex-1 basis-[200px] border-2 border-black shadow-md px-4 py-3.5 ${className}`}>
      <div className={`text-[10.5px] font-bold tracking-widest uppercase ${subMuted ? 'text-muted-foreground' : ''}`}>{label}</div>
      <div className="text-[26px] font-bold mt-1">{value}</div>
      <div className={`text-[12.5px] ${subMuted ? 'text-muted-foreground' : ''}`}>{sub}</div>
    </div>
  );
}

export default function Indicators({ view }) {
  const i = view.indicadores;
  const adelante = (i.contraPlan ?? 0) >= 0;
  const sinCierres = !view.hayCierres;

  return (
    <section aria-label="Resumen" className="flex flex-wrap gap-3.5">
      <Tile label="Fondo contado" value={mxn(i.fondoContado)} sub="saldo inicial + aportaciones − retiros" />
      {sinCierres ? (
        <Tile label="Contra el plan" value="—" sub="aparece con tu primer cierre" />
      ) : (
        <Tile
          label="Contra el plan"
          value={mxnSigned(i.contraPlan)}
          sub={`${adelante ? 'vas adelantado' : 'vas atrasado'}; el plan pedía ${mxn(i.planFondoHoy)}`}
          className={adelante ? 'bg-[#0FDB6B]' : 'bg-[#FF6B6B]'}
          subMuted={false}
        />
      )}
      <Tile
        label="Ahorro promedio real"
        value={i.promReal == null ? '—' : mxn(i.promReal)}
        sub={i.promPlan == null ? 'aparece con tu primer cierre' : `al mes; el plan promedia ${mxn(i.promPlan)}`}
      />
      <Tile
        label="Si salieras hoy"
        value={`${i.mesesLibre.toFixed(1)} meses`}
        sub={view.reservadoHoy > 0 ? `cubiertos; ${i.mesesTodo.toFixed(1)} si cancelas los retiros planeados` : 'cubiertos con tu fondo'}
      />
    </section>
  );
}
