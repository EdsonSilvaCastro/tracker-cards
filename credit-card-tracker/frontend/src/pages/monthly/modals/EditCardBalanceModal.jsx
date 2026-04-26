import React from 'react';
import { CreditCard } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';

export default function EditCardBalanceModal({ card, form, onFormChange, onSave, onClose, saving }) {
  if (!card) return null;

  return (
    <Modal isOpen={!!card} onClose={onClose} title={`Editar — ${card.card_name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{card.card_name}</p>
            <p className="text-sm text-gray-500">{card.bank}</p>
          </div>
        </div>

        {/* Total balance */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <label className="block text-sm font-medium text-amber-700 mb-2">
            💳 Balance total (deuda completa en tarjeta)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              value={form.current_balance}
              onChange={(e) => onFormChange('current_balance', e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 text-lg font-semibold text-amber-700 bg-white border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
          </div>
        </div>

        {/* Amount to pay */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <label className="block text-sm font-medium text-green-700 mb-2">
            ✓ Monto a pagar este mes
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              value={form.amount_to_pay}
              onChange={(e) => onFormChange('amount_to_pay', e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 text-lg font-semibold text-green-700 bg-white border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
