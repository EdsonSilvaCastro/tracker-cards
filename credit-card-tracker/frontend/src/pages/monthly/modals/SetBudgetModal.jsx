import React from 'react';
import { Modal, Button, Input } from '../../../components/ui';

export default function SetBudgetModal({ isOpen, value, onChange, onSave, onClose, saving, monthName, year }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Establecer presupuesto mensual">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Presupuesto total para {monthName} {year}
        </p>
        <Input
          label="Presupuesto total"
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
        />
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
