import React from 'react';
import { CreditCard } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';

export default function EditCardBalanceModal({ card, form, onFormChange, onSave, onClose, saving }) {
  if (!card) return null;

  return (
    <Modal isOpen={!!card} onClose={onClose} title={`Editar — ${card.card_name}`}>
      <div className="space-y-4">
        {/* Card info */}
        <div className="flex items-center gap-3 p-3 border-2 border-black bg-(--color-cream)">
          <div className="p-2 border-2 border-black bg-(--color-primary)">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="font-head font-bold">{card.card_name}</p>
            <p className="text-sm text-gray-600">{card.bank}</p>
          </div>
        </div>

        {/* Total balance */}
        <div className="p-4 border-2 border-black bg-(--color-primary)/20">
          <label className="block text-sm font-bold mb-2">
            💳 Balance total (deuda completa en tarjeta)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black">$</span>
            <input
              type="number"
              step="0.01"
              value={form.current_balance}
              onChange={(e) => onFormChange('current_balance', e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 text-lg font-black bg-white border-2 border-black focus:outline-none focus:shadow-[2px_2px_0_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
            />
          </div>
        </div>

        {/* Amount to pay */}
        <div className="p-4 border-2 border-black bg-green-400/30">
          <label className="block text-sm font-bold mb-2">
            ✓ Monto a pagar este mes
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black">$</span>
            <input
              type="number"
              step="0.01"
              value={form.amount_to_pay}
              onChange={(e) => onFormChange('amount_to_pay', e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 text-lg font-black bg-white border-2 border-black focus:outline-none focus:shadow-[2px_2px_0_0_#000] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
