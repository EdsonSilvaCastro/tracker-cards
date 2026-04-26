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
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Gastado real</p>
        <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalSpentOnCards)}</p>
        <p className="text-xs text-gray-400 mt-1">en tarjetas</p>
      </div>

      {/* En plan */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
        <p className="text-xs text-green-600 mb-1">En plan</p>
        <p className="text-xl font-semibold text-green-700">{formatCurrency(totalInPlan)}</p>
        <p className="text-xs text-green-500 mt-1">gastos asignados</p>
      </div>

      {/* Fuera de plan — KPI principal */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-xs text-red-600 mb-1 font-medium">⚡ Fuera de plan</p>
        <p className="text-xl font-semibold text-red-700">{formatCurrency(totalOutOfPlan)}</p>
        <p className="text-xs text-red-400 mt-1">sin categorizar</p>
      </div>

      {/* Ritmo */}
      <div className={`border rounded-xl p-4 ${ritmoBg}`}>
        <p className="text-xs text-gray-500 mb-1">Ritmo</p>
        <p className={`text-xl font-semibold ${ritmoColor}`}>{ritmoLabel}</p>
        <p className="text-xs text-gray-400 mt-1">vs ritmo ideal</p>
      </div>
    </div>
  );
}
