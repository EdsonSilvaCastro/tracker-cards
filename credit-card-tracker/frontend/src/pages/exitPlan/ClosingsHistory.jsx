import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { mxn, mxnSigned, mesCorto } from './format';

const th = 'px-3 py-2.5 font-bold';

export default function ClosingsHistory({ view, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const ini = view.inicioFila;

  return (
    <section aria-labelledby="t-hist" className="bg-white border-2 border-black shadow-md">
      <div className="border-b-2 border-black px-4 py-2.5">
        <h2 id="t-hist" className="text-[13px] font-bold tracking-wider uppercase">Historial de cierres</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[13.5px] tabular-nums">
          <thead>
            <tr className="text-left text-[10.5px] tracking-widest uppercase text-muted-foreground">
              <th scope="col" className={`${th} px-4`}>Mes</th>
              <th scope="col" className={`${th} text-right`}>Plan</th>
              <th scope="col" className={`${th} text-right`}>Ahorrado</th>
              <th scope="col" className={`${th} text-right`}>Diferencia</th>
              <th scope="col" className={`${th} text-right`}>Retiros</th>
              <th scope="col" className={`${th} text-right`}>Fondo</th>
              <th scope="col" className={`${th} px-4`}>Notas</th>
              <th scope="col" className={`${th} relative`}><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#C9CCD2]">
              <td className="px-4 py-3 font-bold">Inicio</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">{ini.retiro > 0 ? mxnSigned(-ini.retiro) : '—'}</td>
              <td className="px-3 py-3 text-right font-bold">{mxn(ini.fondo)}</td>
              <td className="px-4 py-3">Saldo inicial {mxn(ini.saldoInicial)}{ini.retiro > 0 ? '; préstamo liquidado' : ''}</td>
              <td />
            </tr>
            {view.filas.map((f) => (
              <tr key={f.id} className="border-t border-[#C9CCD2]">
                <td className="px-4 py-3 font-bold">{mesCorto(f.m)}</td>
                <td className="px-3 py-3 text-right">{mxn(f.plan)}</td>
                <td className="px-3 py-3 text-right font-bold">{mxn(f.ahorrado)}</td>
                <td className="px-3 py-3 text-right">
                  <span className={`border-2 border-black px-1.5 py-0.5 font-bold ${f.diferencia >= 0 ? 'bg-[#0FDB6B]' : 'bg-[#FF6B6B]'}`}>
                    {mxnSigned(f.diferencia)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">{f.retiros > 0 ? mxnSigned(-f.retiros) : '—'}</td>
                <td className="px-3 py-3 text-right font-bold">{mxn(f.fondo)}</td>
                <td className="px-4 py-3">{f.nota || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {confirmId === f.id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      ¿Borrar?
                      <button type="button" onClick={() => { setConfirmId(null); onDelete(f); }} className="border-2 border-black bg-[#FF6B6B] px-2 py-1 font-bold min-h-[36px]">Sí</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="border-2 border-black bg-white px-2 py-1 font-bold min-h-[36px]">No</button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-1.5">
                      <button type="button" aria-label={`Editar cierre de ${mesCorto(f.m)}`} onClick={() => onEdit(f)} className="border-2 border-black bg-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-accent"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" aria-label={`Borrar cierre de ${mesCorto(f.m)}`} onClick={() => setConfirmId(f.id)} className="border-2 border-black bg-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-accent"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[#C9CCD2] text-muted-foreground">
              <td className="px-4 py-3 font-bold">{mesCorto(view.siguiente)}</td>
              <td className="px-3 py-3 text-right">{mxn(view.planSiguiente)}</td>
              <td className="px-3 py-3 text-right">pendiente</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-4 py-3">{view.extrasSiguiente > 0 ? `Incluye ${mxn(view.extrasSiguiente)} de extras` : ''}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
