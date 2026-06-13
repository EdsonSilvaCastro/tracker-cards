import { useState, useEffect } from 'react';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SavingsAllocationModal({
  allocation,
  savingsGoals,
  existingGoalIds,
  month,
  year,
  onSave,
  onClose,
}) {
  const isEdit = !!allocation;

  // Goals available for selection: active ones not already assigned, plus the current one if editing
  const availableGoals = savingsGoals.filter(
    g => !existingGoalIds.includes(g.id) || (isEdit && g.id === allocation.savings_goal_id)
  );

  const [goalId, setGoalId] = useState(isEdit ? allocation.savings_goal_id : (availableGoals[0]?.id || ''));
  const [amount, setAmount] = useState(isEdit ? String(allocation.amount) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit && availableGoals.length > 0 && !goalId) {
      setGoalId(availableGoals[0].id);
    }
  }, [availableGoals.length]);

  const selectedGoal = savingsGoals.find(g => g.id === goalId);
  const monthLabel = MONTHS_EN[month - 1];

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (!goalId) { setError('Selecciona un plan de ahorro'); return; }
    if (!parsed || parsed <= 0) { setError('Ingresa un monto válido'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ month, year, savings_goal_id: goalId, amount: parsed });
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black shadow-[6px_6px_0_0_#000] p-6 max-w-sm w-full">
        <h3 className="font-head text-lg font-black mb-4 border-b-2 border-black pb-2">
          {isEdit ? 'Editar ahorro' : 'Agregar ahorro'} · {monthLabel} {year}
        </h3>

        <div className="space-y-4">
          {/* Goal selector */}
          <div>
            <label className="block text-sm font-bold mb-2">Plan de ahorro</label>
            {availableGoals.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay planes activos disponibles</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {availableGoals.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoalId(g.id)}
                    className={`px-3 py-2 text-sm font-medium border-2 border-black text-left transition-all ${
                      goalId === g.id
                        ? 'bg-(--color-primary) font-bold shadow-[2px_2px_0_0_#000]'
                        : 'bg-white hover:bg-(--color-accent)'
                    }`}
                  >
                    {g.goal_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-sm font-bold mb-1">Monto mensual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
              />
            </div>
          </div>

          {/* Preview */}
          {selectedGoal && amount && parseFloat(amount) > 0 && (
            <div className="border-2 border-black bg-(--color-accent) px-3 py-2 text-xs font-medium leading-relaxed shadow-[2px_2px_0_0_#000]">
              Se añadirá <strong>${parseFloat(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> al plan{' '}
              <strong>{selectedGoal.goal_name}</strong> como depósito del 1 de {monthLabel} {year}.
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-bold border-2 border-black bg-white shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || availableGoals.length === 0}
              className="flex-1 py-2 text-sm font-bold border-2 border-black bg-black text-white shadow-[3px_3px_0_0_#555] hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
