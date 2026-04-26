import React from 'react';

export default function MonthlyHero({
  totalBudget,
  totalSpentOnCards,
  currentDayOfMonth,
  daysInMonth,
  remainingDays,
  formatCurrency,
}) {
  const available = totalBudget - totalSpentOnCards;
  const dailyBudget = remainingDays > 0 ? available / remainingDays : 0;
  const progressPct = totalBudget > 0 ? Math.min((totalSpentOnCards / totalBudget) * 100, 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">
        Disponible este mes
      </p>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-4xl font-medium ${available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(available)}
        </p>
        <div className="text-right text-sm text-gray-500 flex-shrink-0">
          <p>de {formatCurrency(totalBudget)}</p>
          {remainingDays > 0 && totalBudget > 0 && (
            <p className="text-xs mt-0.5 text-gray-400">
              ~{formatCurrency(Math.max(0, dailyBudget))}/día disponible
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progressPct >= 100 ? 'bg-red-500' : progressPct >= 90 ? 'bg-amber-400' : 'bg-green-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">Día {currentDayOfMonth} de {daysInMonth}</span>
        <span className="text-xs text-gray-400">{remainingDays} días restantes</span>
      </div>
    </div>
  );
}
