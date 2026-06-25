import React, { useState } from 'react';

// One line of the hover/tap breakdown
function BreakdownRow({ label, value, formatCurrency, bold }) {
  return (
    <div
      className={`flex justify-between gap-4 py-0.5 ${
        bold ? 'font-black text-black' : 'font-medium text-black/80'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

// Small labelled swatch for the bucket legend
function Swatch({ swatchClass, hatch, label, value, formatCurrency }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className={`inline-block h-3 w-3 border border-black flex-shrink-0 ${swatchClass || ''}`}
        style={hatch ? { backgroundImage: HATCH } : undefined}
      />
      <span className="truncate">
        <span className="text-black/60">{label}</span>{' '}
        <span className="text-black tabular-nums">{formatCurrency(value)}</span>
      </span>
    </div>
  );
}

// Diagonal hatch used for the "falta por pagar" segment (pending obligations)
const HATCH =
  'repeating-linear-gradient(45deg, #fb923c 0, #fb923c 5px, #1a1a1a 5px, #1a1a1a 7px)';

export default function MonthlyHero({
  hero,
  currentDayOfMonth,
  daysInMonth,
  remainingDays,
  formatCurrency,
}) {
  const {
    ingreso_mensual: ingreso = 0,
    ahorro_reservado: ahorro = 0,
    ya_pagado: pagado = 0,
    falta_por_pagar: falta = 0,
    presupuestado_total: plan = 0,
    disponible_plan: libre = 0,
    colchon_planeado = 0,
    plan_exceeded = false,
    plan_excess = 0,
  } = hero || {};

  const [showBreakdown, setShowBreakdown] = useState(false);

  const negative = libre < 0;
  const base = ingreso > 0 ? ingreso : 1;
  const w = (v) => `${Math.max(0, Math.min(100, (v / base) * 100))}%`;
  // Plan marker sits after savings, at the budgeted-plan boundary
  const planMarker = Math.max(0, Math.min(100, ((ahorro + plan) / base) * 100));

  return (
    <div
      className={`border-2 border-black shadow-[4px_4px_0_0_#000] p-6 ${
        negative ? 'bg-red-400' : 'bg-(--color-primary)'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-bold tracking-widest uppercase text-black/60">
          Te queda libre
        </p>
        <p className="text-xs font-bold text-black/60 flex-shrink-0">
          Día {currentDayOfMonth} de {daysInMonth}
        </p>
      </div>

      {/* Hero number — tap/hover for the breakdown */}
      <div
        className="relative inline-block mt-2"
        onMouseEnter={() => setShowBreakdown(true)}
        onMouseLeave={() => setShowBreakdown(false)}
      >
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          aria-expanded={showBreakdown}
          className="text-4xl sm:text-5xl font-black font-[var(--font-head)] text-black text-left underline decoration-dotted decoration-2 underline-offset-4 cursor-help"
        >
          {formatCurrency(libre)}
        </button>
        {showBreakdown && (
          <div className="absolute z-20 left-0 top-full mt-2 w-72 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-3 text-sm font-bold">
            <BreakdownRow label="Ingreso del mes" value={ingreso} formatCurrency={formatCurrency} />
            <BreakdownRow label="Ahorro reservado" value={-ahorro} formatCurrency={formatCurrency} />
            <BreakdownRow label="Ya pagado en tarjetas" value={-pagado} formatCurrency={formatCurrency} />
            <BreakdownRow label="Falta por pagar" value={-falta} formatCurrency={formatCurrency} />
            <div className="border-t-2 border-black my-1.5" />
            <BreakdownRow label="Te queda libre" value={libre} formatCurrency={formatCurrency} bold />
          </div>
        )}
      </div>
      <p className="text-xs text-black/60 mt-1">
        después de ahorro y de lo que aún falta por pagar · de {formatCurrency(ingreso)}
      </p>

      {/* Composition bar: ahorro + pagado + falta + libre = ingreso */}
      <div className="relative mt-5 h-8 border-2 border-black bg-white overflow-hidden">
        <div className="flex h-full w-full">
          <div className="h-full bg-slate-400" style={{ width: w(ahorro) }} />
          <div className="h-full bg-black" style={{ width: w(pagado) }} />
          <div className="h-full" style={{ width: w(falta), backgroundImage: HATCH }} />
          {/* remaining width is the white track = libre */}
        </div>
        {/* Plan marker */}
        {plan > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600"
            style={{ left: `${planMarker}%` }}
            title={`Plan: ${formatCurrency(plan)}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 mt-3 text-xs font-bold">
        <Swatch swatchClass="bg-slate-400" label="Ahorro" value={ahorro} formatCurrency={formatCurrency} />
        <Swatch swatchClass="bg-black" label="Ya pagado" value={pagado} formatCurrency={formatCurrency} />
        <Swatch hatch label="Falta por pagar" value={falta} formatCurrency={formatCurrency} />
        <Swatch swatchClass="bg-white" label="Libre" value={libre} formatCurrency={formatCurrency} />
      </div>

      {/* Status line */}
      {plan_exceeded ? (
        <p className="text-xs font-bold mt-3 text-red-700">
          ⚠ Vas {formatCurrency(plan_excess)} sobre tu plan — el colchón bajó de{' '}
          {formatCurrency(colchon_planeado)}.
        </p>
      ) : (
        <p className="text-xs font-bold mt-3 text-black/60">
          Vas dentro del plan
          {remainingDays > 0 && libre > 0
            ? ` · ~${formatCurrency(libre / remainingDays)}/día por ${remainingDays} días`
            : ''}
        </p>
      )}

      {/* Still-to-pay reminder */}
      {falta > 0 && (
        <p className="text-xs font-bold text-black/70 mt-1">
          Aún por pagar este mes: {formatCurrency(falta)}
        </p>
      )}
    </div>
  );
}
