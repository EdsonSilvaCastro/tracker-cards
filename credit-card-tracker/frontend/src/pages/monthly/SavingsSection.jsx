import { Pencil, Trash2, PiggyBank, Plus } from 'lucide-react';

export default function SavingsSection({
  allocations,
  savingsGoals,
  totalCommitment,
  onAdd,
  onEdit,
  onDelete,
  formatCurrency,
}) {
  const activeGoals = savingsGoals.filter(g => g.status === 'active');
  const allAssigned = activeGoals.length > 0 && activeGoals.every(
    g => allocations.some(a => a.savings_goal_id === g.id)
  );

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-(--color-primary) border-b-2 border-black flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-black" />
          <span className="font-bold text-sm text-black uppercase tracking-wide">Ahorro del mes</span>
          {totalCommitment > 0 && (
            <span className="px-2 py-0.5 text-xs bg-black text-white font-bold border border-black">
              {formatCurrency(totalCommitment)}
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={allAssigned || activeGoals.length === 0}
          className="flex items-center gap-1 text-xs font-bold border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>

      {/* Allocations list */}
      {allocations.length === 0 ? (
        <div className="px-4 py-5 text-center text-black/40 text-sm font-bold">
          Sin ahorro asignado este mes
        </div>
      ) : (
        <div className="divide-y divide-black/10">
          {allocations.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-black truncate">{a.goal_name}</p>
              </div>
              <span className="text-sm font-black text-black flex-shrink-0">
                {formatCurrency(a.amount)}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(a)}
                  className="p-1 border border-black bg-white hover:bg-(--color-accent) transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="p-1 border border-black bg-white hover:bg-red-100 hover:border-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
