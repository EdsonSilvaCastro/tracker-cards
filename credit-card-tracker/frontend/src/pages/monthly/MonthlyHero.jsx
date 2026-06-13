import React from 'react';

export default function MonthlyHero({
  totalBudget,
  totalSpentOnCards,
  totalSavingsCommitment = 0,
  currentDayOfMonth,
  daysInMonth,
  remainingDays,
  formatCurrency,
}) {
  const available = totalBudget - totalSpentOnCards - totalSavingsCommitment;
  const dailyBudget = remainingDays > 0 ? available / remainingDays : 0;
  const progressPct = totalBudget > 0 ? Math.min((totalSpentOnCards / totalBudget) * 100, 100) : 0;

  return (
    <div className="bg-(--color-primary) border-2 border-black shadow-[4px_4px_0_0_#000] p-6">
      <p className="text-xs font-bold tracking-widest uppercase mb-3 text-black/60">
        Disponible este mes
      </p>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-4xl font-black font-[var(--font-head)] ${available >= 0 ? 'text-black' : 'text-red-700'}`}>
          {formatCurrency(available)}
        </p>
        <div className="text-right text-sm text-black/70 flex-shrink-0">
          <p className="font-bold">de {formatCurrency(totalBudget)}</p>
          {remainingDays > 0 && totalBudget > 0 && (
            <p className="text-xs mt-0.5 text-black/50">
              ~{formatCurrency(Math.max(0, dailyBudget))}/día disponible
            </p>
          )}
        </div>
      </div>
      {totalSavingsCommitment > 0 && (
        <p className="text-xs font-bold text-black/60 mt-1">
          Ahorro reservado: {formatCurrency(totalSavingsCommitment)}
        </p>
      )}
      <div className="mt-4 h-3 bg-black/20 border border-black overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            progressPct >= 100 ? 'bg-red-500' : progressPct >= 90 ? 'bg-orange-500' : 'bg-black'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs font-bold text-black/60">Día {currentDayOfMonth} de {daysInMonth}</span>
        <span className="text-xs font-bold text-black/60">{remainingDays} días restantes</span>
      </div>
    </div>
  );
}
