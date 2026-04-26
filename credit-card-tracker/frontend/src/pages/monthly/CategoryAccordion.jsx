import React from 'react';
import { ChevronRight, Plus, Copy } from 'lucide-react';
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
  formatCurrency,
}) {
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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Accordion header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Color bar */}
        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${config.barColor}`} />

        {/* Caret */}
        <ChevronRight
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />

        {/* Name + at-risk badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${config.textColor}`}>{config.name}</span>
            {isAtRisk && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                En riesgo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {paidCount} de {section.expenses.length} pagados
          </p>
        </div>

        {/* Amounts */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(section.total_spent)}
          </p>
          <p className="text-xs text-gray-400">/ {formatCurrency(section.total_budgeted)}</p>
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressBarColor}`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <>
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {section.expenses.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
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

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 bg-gray-50">
            <button
              onClick={() => onAddExpense(section.key)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar item
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => onCopySection(section.key)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
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
