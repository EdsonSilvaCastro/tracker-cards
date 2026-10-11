import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import ClosingFields from './ClosingFields';
import { closingPayload } from './ClosingForm';
import { ymLargo } from './format';

export default function EditClosingModal({ closing, onSave, onClose }) {
  const [values, setValues] = useState({
    ahorrado: String(closing.ahorrado),
    retiros: closing.retiros ? String(closing.retiros) : '',
    huboViaje: closing.huboViaje,
    abrioCompraAMeses: closing.abrioCompraAMeses,
    nota: closing.nota || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const { data, error: invalid } = closingPayload(closing.month, values);
    if (invalid) return setError(invalid);
    setSaving(true);
    setError(null);
    try {
      await onSave(closing.id, data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el cierre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Editar cierre de ${ymLargo(closing.month).toLowerCase()}`}>
      <form onSubmit={submit} className="space-y-4">
        <ClosingFields idPrefix="e" values={values} onChange={setValues} error={error} />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
