import React from 'react';

export default function MonthlyStats({
  totalSpentOnCards,
  committedInCycle,
  totalOutOfPlan,
  totalBudget,
  currentDayOfMonth,
  daysInMonth,
  formatCurrency,
}) {
  // Holgura = qué tan adelantado/pasado vas vs el ritmo ideal de gasto.
  // Positiva = vas adelantado (has gastado menos que el % de mes transcurrido).
  // Negativa = vas pasado. El signo del número coincide con el color.
  const ritmoIdeal = daysInMonth > 0 ? currentDayOfMonth / daysInMonth : 0;
  const ritmoReal = totalBudget > 0 ? totalSpentOnCards / totalBudget : 0;
  const holgura = (ritmoIdeal - ritmoReal) * 100;

  const holguraBg =
    holgura <= -5 ? 'bg-red-400' : holgura < 0 ? 'bg-orange-300' : 'bg-green-400';
  const holguraLabel = `${holgura >= 0 ? '+' : ''}${holgura.toFixed(1)}%`;
  const holguraNote = holgura >= 0 ? 'vas adelantado' : 'vas pasado';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Cargado a tarjeta */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/50 uppercase tracking-wide mb-1">Cargado a tarjeta</p>
        <p className="text-xl font-black text-black">{formatCurrency(totalSpentOnCards)}</p>
        <p className="text-xs text-black/40 mt-1">ya facturado</p>
      </div>

      {/* Comprometido en ciclo */}
      <div className="bg-green-400 border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">Comprometido en ciclo</p>
        <p className="text-xl font-black text-black">{formatCurrency(committedInCycle)}</p>
        <p className="text-xs text-black/50 mt-1">incluye mensualidades pendientes del ciclo</p>
      </div>

      {/* Fuera de plan — KPI principal */}
      <div className="bg-red-400 border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">⚡ Fuera de plan</p>
        <p className="text-xl font-black text-black">{formatCurrency(totalOutOfPlan)}</p>
        <p className="text-xs text-black/50 mt-1">sin categorizar</p>
      </div>

      {/* Holgura */}
      <div className={`border-2 border-black shadow-[4px_4px_0_0_#000] p-4 ${holguraBg}`}>
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">Holgura</p>
        <p className="text-xl font-black text-black">{holguraLabel}</p>
        <p className="text-xs text-black/50 mt-1">{holguraNote}</p>
      </div>
    </div>
  );
}
