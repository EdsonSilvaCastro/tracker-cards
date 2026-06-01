import React, { useState } from 'react';
import { ChevronRight, Plus, Copy, Download } from 'lucide-react';
import ExpenseRow from './ExpenseRow';

const SECTION_CONFIG = {
  living_expenses: {
    name: 'Living Expenses',
    barColor: 'bg-blue-500',
    textColor: 'text-blue-700',
  },
  life_style: {
    name: 'Life Style',
    barColor: 'bg-purple-500',
    textColor: 'text-purple-700',
  },
  monthly_payments: {
    name: 'Monthly Payments',
    barColor: 'bg-green-500',
    textColor: 'text-green-700',
  },
  general_expenses: {
    name: 'General Expenses',
    barColor: 'bg-amber-500',
    textColor: 'text-amber-700',
  },
};

export default function CategoryAccordion({
  section,
  isExpanded,
  onToggle,
  inlineEditing,
  inlineValue,
  deleteConfirm,
  allCards,
  onStartInlineEdit,
  onInlineChange,
  onInlineKeyDown,
  onSaveInlineEdit,
  onCycleStatus,
  onQuickPay,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
  onAssignCard,
  onAddExpense,
  onCopySection,
  suggestedPlans = [],
  onImportInstallments,
  formatCurrency,
}) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!onImportInstallments || importing) return;
    setImporting(true);
    try {
      await onImportInstallments(suggestedPlans);
    } finally {
      setImporting(false);
    }
  };
  const config = SECTION_CONFIG[section.key] || SECTION_CONFIG.general_expenses;
  const percentSpent =
    section.total_budgeted > 0
      ? (section.total_spent / section.total_budgeted) * 100
      : 0;
  const isAtRisk = percentSpent > 85;
  const paidCount = section.expenses.filter((e) => e.status === 'paid').length;

  const progressBarColor =
    percentSpent >= 100
      ? 'bg-red-500'
      : percentSpent >= 85
      ? 'bg-amber-400'
      : config.barColor;

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-(--color-primary) transition-colors text-left"
      >
        {/* Color bar */}
        <div className={`w-1.5 h-8 flex-shrink-0 border border-black ${config.barColor}`} />

        {/* Caret */}
        <ChevronRight
          className={`h-4 w-4 text-black flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />

        {/* Name + at-risk badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-black uppercase tracking-wide">{config.name}</span>
            {isAtRisk && (
              <span className="px-1.5 py-0.5 text-xs bg-red-400 text-black border border-black font-bold">
                En riesgo
              </span>
            )}
          </div>
          <p className="text-xs text-black/50">
            {paidCount} de {section.expenses.length} pagados
          </p>
        </div>

        {/* Amounts */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-black">
            {formatCurrency(section.total_spent)}
          </p>
          <p className="text-xs text-black/50">/ {formatCurrency(section.total_budgeted)}</p>
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-2 bg-black/10 border border-black/20 overflow-hidden">
          <div
            className={`h-full transition-all ${progressBarColor}`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <>
          <div className="border-t-2 border-black divide-y divide-black/10">
            {section.expenses.length === 0 ? (
              <div className="px-4 py-6 text-center text-black/40 text-sm font-bold">
                Sin gastos aún
              </div>
            ) : (
              section.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  inlineEditing={inlineEditing}
                  inlineValue={inlineValue}
                  deleteConfirm={deleteConfirm}
                  allCards={allCards}
                  onStartInlineEdit={onStartInlineEdit}
                  onInlineChange={onInlineChange}
                  onInlineKeyDown={onInlineKeyDown}
                  onSaveInlineEdit={onSaveInlineEdit}
                  onCycleStatus={onCycleStatus}
                  onQuickPay={onQuickPay}
                  onDeleteConfirm={onDeleteConfirm}
                  onDeleteCancel={onDeleteCancel}
                  onDelete={onDelete}
                  onAssignCard={onAssignCard}
                  formatCurrency={formatCurrency}
                />
              ))
            )}
          </div>

          {/* Installment plan suggestions */}
          {suggestedPlans.length > 0 && (
            <div className="mx-4 mb-3 border-2 border-black bg-[#ffdb33] shadow-[3px_3px_0_0_#000] px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-black">
                <span className="font-bold">{suggestedPlans.length} plan{suggestedPlans.length > 1 ? 'es' : ''} activo{suggestedPlans.length > 1 ? 's' : ''} este mes:</span>{' '}
                {suggestedPlans.map(p => p.name).join(', ')}
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 transition-all whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                {importing ? 'Importando…' : 'Importar'}
              </button>
            </div>
          )}

          {/* Footer actions */}
          <div className="px-4 py-3 border-t-2 border-black flex items-center gap-3 bg-(--color-primary)">
            <button
              onClick={() => onAddExpense(section.key)}
              className="text-sm font-bold text-black hover:underline flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar item
            </button>
            <span className="text-black/30">·</span>
            <button
              onClick={() => onCopySection(section.key)}
              className="text-sm font-bold text-black/60 hover:text-black flex items-center gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar de mes anterior
            </button>
          </div>
        </>
      )}
    </div>
  );
}
