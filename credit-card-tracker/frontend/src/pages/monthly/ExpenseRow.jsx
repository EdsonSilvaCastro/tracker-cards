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
      ? 'bg-(--color-primary) text-black border-black'
      : expense.paid_with === 'cash'
      ? 'bg-black/10 text-black border-black/30'
      : 'bg-black text-white border-black';

  return (
    <div className="px-4 py-3 hover:bg-(--color-primary)/20 group">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status dot — click to cycle */}
        <button
          onClick={() => onCycleStatus(expense)}
          className={`w-3 h-3 border border-black flex-shrink-0 transition-opacity hover:opacity-70 ${dotColor}`}
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
            className="flex-1 text-sm font-bold px-1 py-0.5 border-2 border-black focus:outline-none focus:shadow-[2px_2px_0_0_#000] min-w-[100px]"
          />
        ) : (
          <>
            <span
              onClick={() => onStartInlineEdit(expense, 'expense_name')}
              className="flex-1 font-bold text-black cursor-pointer hover:underline truncate text-sm min-w-[80px]"
              title="Clic para editar"
            >
              {expense.expense_name}
            </span>
            {expense.auto_created && (
              <span
                className="inline-block w-1.5 h-1.5 bg-black/40 flex-shrink-0"
                title="Creado automáticamente desde una transacción sin match"
              />
            )}
          </>
        )}

        {/* paid_with pill */}
        <select
          value={expense.paid_with || ''}
          onChange={(e) => onAssignCard(expense, e.target.value || null)}
          className={`text-xs px-2 py-0.5 border cursor-pointer focus:outline-none ${paidWithStyle}`}
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
            className="w-20 text-xs text-right px-1 py-0.5 border-2 border-black focus:outline-none"
          />
        ) : (
          <span
            onClick={() => onStartInlineEdit(expense, 'budgeted_amount')}
            className="text-xs text-black/50 cursor-pointer hover:underline bg-black/5 border border-black/20 px-1.5 py-0.5 font-bold"
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
            className="w-20 text-xs text-right px-1 py-0.5 border-2 border-black focus:outline-none"
          />
        ) : (
          <span
            onClick={() => onStartInlineEdit(expense, 'actual_spent')}
            className="text-xs font-bold cursor-pointer hover:underline bg-(--color-primary) border border-black text-black px-1.5 py-0.5"
            title="Gastado — clic para editar"
          >
            {formatCurrency(expense.actual_spent)}
          </span>
        )}

        {/* Quick pay */}
        {expense.status !== 'paid' && (
          <button
            onClick={() => onQuickPay(expense)}
            className="p-1 text-green-700 hover:text-black hover:bg-green-400 border border-transparent hover:border-black opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="p-1 text-white bg-red-500 border border-black hover:bg-red-600"
              title="Confirmar"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={onDeleteCancel}
              className="p-1 text-black bg-white border border-black hover:bg-black/10"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onDeleteConfirm(expense.id)}
            className="p-1 text-black/30 hover:text-red-600 border border-transparent hover:border-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
