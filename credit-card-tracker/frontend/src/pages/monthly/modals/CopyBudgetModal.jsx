import React from 'react';
import { Modal, Button, Input, Select } from '../../../components/ui';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SECTION_NAMES = {
  living_expenses: 'Living Expenses',
  life_style: 'Life Style',
  monthly_payments: 'Monthly Payments',
  general_expenses: 'General Expenses',
};

export default function CopyBudgetModal({
  isOpen,
  sectionKey,
  form,
  onFormChange,
  onCopy,
  onClose,
  saving,
  currentMonthName,
  currentYear,
}) {
  const isSection = !!sectionKey;
  const title = isSection
    ? `Copiar ${SECTION_NAMES[sectionKey] || 'Sección'} de otro mes`
    : 'Copiar presupuesto de otro mes';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {isSection ? (
            <>
              Copiar solo <strong>{SECTION_NAMES[sectionKey]}</strong> a {currentMonthName} {currentYear}
            </>
          ) : (
            <>Copiar todos los gastos a {currentMonthName} {currentYear}</>
          )}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Desde mes"
            value={form.from_month}
            onChange={(e) => onFormChange('from_month', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Input
            label="Desde año"
            type="number"
            value={form.from_year}
            onChange={(e) => onFormChange('from_year', e.target.value)}
            placeholder={currentYear.toString()}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.include_actual}
            onChange={(e) => onFormChange('include_actual', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Incluir montos gastados</span>
        </label>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onCopy} disabled={saving} className="flex-1">
            {saving ? 'Copiando...' : 'Copiar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
