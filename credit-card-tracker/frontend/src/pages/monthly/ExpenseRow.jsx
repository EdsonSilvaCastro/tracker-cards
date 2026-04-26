import React from 'react';
import { CheckCircle, Trash2, Check, X } from 'lucide-react';

const STATUS_DOT = {
  paid: 'bg-green-500',
  pending: 'bg-yellow-400',
  partial: 'bg-orange-400',
};

export default function ExpenseRow({
  expense,
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
  formatCurrency,
}) {
  const dotColor = STATUS_DOT[expense.status] || STATUS_DOT.pending;
  const isEditingName = inlineEditing?.id === expense.id && inlineEditing?.field === 'expense_name';
  const isEditingBudgeted = inlineEditing?.id === expense.id && inlineEditing?.field === 'budgeted_amount';
  const isEditingSpent = inlineEditing?.id === expense.id && inlineEditing?.field === 'actual_spent';

  const paidWithStyle =
    expense.paid_with == null
      ? 'bg-amber-100 text-amber-700'
      : expense.paid_with === 'cash'
      ? 'bg-gray-100 text-gray-600'
      : 'bg-blue-100 text-blue-700';

  const paidWithLabel = () => {
    if (expense.paid_with == null) return 'Sin asignar';
    if (expense.paid_with === 'cash') return 'Efectivo';
    const card = allCards.find((c) => c.id === expense.paid_with);
    return card ? card.card_name : 'Sin asignar';
  };

  return (
    <div className="px-4 py-3 hover:bg-gray-50 group">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status dot — click to cycle */}
        <button
          onClick={() => onCycleStatus(expense)}
          className={`w-3 h-3 rounded-full flex-shrink-0 transition-opacity hover:opacity-70 ${dotColor}`}
          title={`Estado: ${expense.status} — clic para cambiar`}
        />

        {/* Name */}
        {isEditingName ? (
          <input
            autoFocus
            type="text"
            value={inlineValue}
            onChange={(e) => onInlineChange(e.target.value)}
            onKeyDown={(e) => onInlineKeyDown(e, expense)}
            onBlur={() => onSaveInlineEdit(expense)}
            className="flex-1 text-sm font-medium px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px]"
          />
        ) : (
          <span
            onClick={() => onStartInlineEdit(expense, 'expense_name')}
            className="flex-1 font-medium text-gray-900 cursor-pointer hover:text-blue-600 truncate text-sm min-w-[80px]"
            title="Clic para editar"
          >
            {expense.expense_name}
          </span>
        )}

        {/* paid_with pill */}
        <select
          value={expense.paid_with || ''}
          onChange={(e) => onAssignCard(expense, e.target.value || null)}
          className={`text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${paidWithStyle}`}
          title="Asignar tarjeta"
        >
          <option value="">Sin asignar</option>
          <option value="cash">Efectivo</option>
          {allCards.map((c) => (
            <option key={c.id} value={c.id}>{c.card_name}</option>
          ))}
        </select>

        {/* Budget */}
        {isEditingBudgeted ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            value={inlineValue}
            onChange={(e) => onInlineChange(e.target.value)}
            onKeyDown={(e) => onInlineKeyDown(e, expense)}
            onBlur={() => onSaveInlineEdit(expense)}
            className="w-20 text-xs text-right px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={() => onStartInlineEdit(expense, 'budgeted_amount')}
            className="text-xs text-gray-500 cursor-pointer hover:text-blue-600 bg-gray-100 px-1.5 py-0.5 rounded"
            title="Presupuestado — clic para editar"
          >
            {formatCurrency(expense.budgeted_amount)}
          </span>
        )}

        {/* Actual spent */}
        {isEditingSpent ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            value={inlineValue}
            onChange={(e) => onInlineChange(e.target.value)}
            onKeyDown={(e) => onInlineKeyDown(e, expense)}
            onBlur={() => onSaveInlineEdit(expense)}
            className="w-20 text-xs text-right px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={() => onStartInlineEdit(expense, 'actual_spent')}
            className="text-xs font-semibold cursor-pointer hover:text-blue-600 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
            title="Gastado — clic para editar"
          >
            {formatCurrency(expense.actual_spent)}
          </span>
        )}

        {/* Quick pay */}
        {expense.status !== 'paid' && (
          <button
            onClick={() => onQuickPay(expense)}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Marcar como pagado con el monto presupuestado"
          >
            <CheckCircle className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Delete with inline confirm */}
        {deleteConfirm === expense.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(expense.id)}
              className="p-1 text-white bg-red-500 hover:bg-red-600 rounded"
              title="Confirmar"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={onDeleteCancel}
              className="p-1 text-gray-500 bg-gray-200 hover:bg-gray-300 rounded"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onDeleteConfirm(expense.id)}
            className="p-1 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
