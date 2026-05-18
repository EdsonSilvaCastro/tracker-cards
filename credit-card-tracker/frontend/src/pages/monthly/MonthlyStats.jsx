import React from 'react';

export default function MonthlyStats({
  totalSpentOnCards,
  totalInPlan,
  totalOutOfPlan,
  totalBudget,
  currentDayOfMonth,
  daysInMonth,
  formatCurrency,
}) {
  const ritmoIdeal = daysInMonth > 0 ? currentDayOfMonth / daysInMonth : 0;
  const ritmoReal = totalBudget > 0 ? totalSpentOnCards / totalBudget : 0;
  const desviacion = (ritmoReal - ritmoIdeal) * 100;

  const ritmoColor =
    desviacion > 5 ? 'text-red-600' : desviacion > 0 ? 'text-amber-500' : 'text-green-600';
  const ritmoBg =
    desviacion > 5 ? 'bg-red-50 border-red-100' : desviacion > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';
  const ritmoLabel =
    desviacion > 0 ? `+${desviacion.toFixed(1)}%` : `${desviacion.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Gastado real */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/50 uppercase tracking-wide mb-1">Gastado real</p>
        <p className="text-xl font-black text-black">{formatCurrency(totalSpentOnCards)}</p>
        <p className="text-xs text-black/40 mt-1">en tarjetas</p>
      </div>

      {/* En plan */}
      <div className="bg-green-400 border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">En plan</p>
        <p className="text-xl font-black text-black">{formatCurrency(totalInPlan)}</p>
        <p className="text-xs text-black/50 mt-1">gastos asignados</p>
      </div>

      {/* Fuera de plan — KPI principal */}
      <div className="bg-red-400 border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">⚡ Fuera de plan</p>
        <p className="text-xl font-black text-black">{formatCurrency(totalOutOfPlan)}</p>
        <p className="text-xs text-black/50 mt-1">sin categorizar</p>
      </div>

      {/* Ritmo */}
      <div className={`border-2 border-black shadow-[4px_4px_0_0_#000] p-4 ${
        desviacion > 5 ? 'bg-red-400' : desviacion > 0 ? 'bg-orange-300' : 'bg-green-400'
      }`}>
        <p className="text-xs font-bold text-black/60 uppercase tracking-wide mb-1">Ritmo</p>
        <p className="text-xl font-black text-black">{ritmoLabel}</p>
        <p className="text-xs text-black/50 mt-1">vs ritmo ideal</p>
      </div>
    </div>
  );
}
