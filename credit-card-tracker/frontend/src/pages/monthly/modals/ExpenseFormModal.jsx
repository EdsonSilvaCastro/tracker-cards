import React from 'react';
import { Modal, Button, Input, Select } from '../../../components/ui';

const SECTION_NAMES = {
  living_expenses: 'Living Expenses',
  life_style: 'Life Style',
  monthly_payments: 'Monthly Payments',
  general_expenses: 'General Expenses',
};

export default function ExpenseFormModal({
  isOpen,
  editingExpense,
  form,
  onFormChange,
  allCards,
  onSave,
  onClose,
  saving,
  sectionLocked,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpense ? 'Editar gasto' : 'Agregar gasto'}
    >
      <div className="space-y-4">
        <Select
          label="Sección"
          value={form.section}
          onChange={(e) => onFormChange('section', e.target.value)}
          disabled={!!sectionLocked}
        >
          <option value="">Seleccionar sección...</option>
          {Object.entries(SECTION_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </Select>

        <Input
          label="Nombre del gasto"
          value={form.expense_name}
          onChange={(e) => onFormChange('expense_name', e.target.value)}
          placeholder="ej. Renta, Netflix"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Presupuestado"
            type="number"
            step="0.01"
            value={form.budgeted_amount}
            onChange={(e) => onFormChange('budgeted_amount', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Gastado"
            type="number"
            step="0.01"
            value={form.actual_spent}
            onChange={(e) => onFormChange('actual_spent', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <Select
          label="Estado"
          value={form.status}
          onChange={(e) => onFormChange('status', e.target.value)}
        >
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="partial">Parcial</option>
        </Select>

        {/* paid_with selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pagado con</label>
          <select
            value={form.paid_with || ''}
            onChange={(e) => onFormChange('paid_with', e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin asignar</option>
            <option value="cash">Efectivo</option>
            {allCards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.card_name} — {c.bank}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
