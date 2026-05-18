import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { cardsApi, cardTransactionsApi } from '../lib/api';

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
  'septiembre','octubre','noviembre','diciembre'];

function monthLabel(m, y) {
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default function QuickExpenseModal({ onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [merchant, setMerchant] = useState('');
  const [merchantSuggestions, setMerchantSuggestions] = useState([]);
  const [matchedExpense, setMatchedExpense] = useState(null);
  const [confirmedMatch, setConfirmedMatch] = useState(false);
  const [autoCreateExpense, setAutoCreateExpense] = useState(true);
  const [billingConflict, setBillingConflict] = useState(null); // { options, suggested }
  const [chosenBilling, setChosenBilling] = useState(null);
  const [activeCards, setActiveCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const amountRef = useRef(null);
  const debounceRef = useRef(null);

  // Foco automático al abrir
  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  // Cargar tarjetas activas
  useEffect(() => {
    cardsApi.getAll().then(res => {
      const cards = (res.data?.data || []).filter(c => c.is_active !== false);
      setActiveCards(cards);
      if (cards.length > 0) setSelectedCard(cards[0]);
    }).catch(() => {});
  }, []);

  // Autocomplete de merchant con debounce 300 ms
  const fetchSuggestions = useCallback((q) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await cardTransactionsApi.merchantAutocomplete(q);
        setMerchantSuggestions(res.data?.data || []);
      } catch {
        setMerchantSuggestions([]);
      }
    }, 300);
  }, []);

  const handleMerchantChange = (value) => {
    setMerchant(value);
    setMatchedExpense(null);
    setConfirmedMatch(false);
    setAutoCreateExpense(true);
    fetchSuggestions(value);
  };

  // Atajos de teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [amount, selectedCard, merchant, confirmedMatch, chosenBilling]);

  const buildPayload = (billing) => ({
    card_id: selectedCard?.id,
    amount: parseFloat(amount),
    merchant: merchant.trim() || 'Sin nombre',
    source: 'manual',
    linked_expense_id: confirmedMatch && matchedExpense ? matchedExpense.id : undefined,
    auto_create_expense: !confirmedMatch && autoCreateExpense,
    ...(billing
      ? { confirmed_billing_month: billing.billing_month, confirmed_billing_year: billing.billing_year }
      : {}),
  });

  const handleSubmit = async (keepOpen = false) => {
    if (!amount || !selectedCard) {
      setError('Ingresa un monto y selecciona una tarjeta.');
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = buildPayload(chosenBilling);
      const res = await cardTransactionsApi.create(payload);

      if (res.data?.ambiguous) {
        // Backend pide confirmar billing cycle
        setBillingConflict(res.data);
        setChosenBilling(res.data.suggested);
        setSaving(false);
        return;
      }

      const responseData = res.data;
      const savedMessage = responseData?.auto_created
        ? `Guardado. Creé "${responseData.linked_expense?.name}" en General expenses.`
        : responseData?.linked_expense
          ? `Guardado y vinculado a "${responseData.linked_expense.name}".`
          : 'Gasto guardado.';

      if (keepOpen) {
        // "Guardar y otro": limpiar campos pero mantener tarjeta
        onSaved?.(savedMessage);
        setAmount('');
        setMerchant('');
        setMerchantSuggestions([]);
        setMatchedExpense(null);
        setConfirmedMatch(false);
        setAutoCreateExpense(true);
        setBillingConflict(null);
        setChosenBilling(null);
        amountRef.current?.focus();
      } else {
        onClose();
        onSaved?.(savedMessage);
      }
    } catch (err) {
      // axios pone la respuesta en err.response
      const data = err.response?.data;
      if (data?.ambiguous) {
        setBillingConflict(data);
        setChosenBilling(data.suggested);
      } else {
        setError(data?.error || 'Error al guardar. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Preview del billing cycle para la tarjeta seleccionada
  const billingPreview = (() => {
    if (!selectedCard?.cutoff_day || !amount) return null;
    const today = new Date();
    const day = today.getDate();
    const cutoff = selectedCard.cutoff_day;
    if (day > cutoff) {
      const nextMonth = today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2;
      const nextYear = today.getMonth() + 2 > 12 ? today.getFullYear() + 1 : today.getFullYear();
      return `📅 Este gasto entra al ciclo de ${monthLabel(nextMonth, nextYear)}`;
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md border-2 border-black shadow-[6px_6px_0_0_#000] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black bg-(--color-primary)">
          <h2 className="font-head text-base font-bold">Registrar gasto</h2>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">
          {/* Amount input */}
          <div className="border-2 border-black bg-black/5 py-4 px-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-black">$</span>
              <input
                ref={amountRef}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-4xl font-black bg-transparent border-none outline-none w-40 text-center"
              />
            </div>
          </div>

          {/* Tarjetas — segmented buttons */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2">Tarjeta</p>
            <div className="flex flex-wrap gap-2">
              {activeCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => { setSelectedCard(card); setBillingConflict(null); setChosenBilling(null); }}
                  className={`px-3 py-1.5 text-sm font-bold border-2 border-black transition-colors ${
                    selectedCard?.id === card.id
                      ? 'bg-black text-white shadow-none translate-x-0.5 translate-y-0.5'
                      : 'bg-white hover:bg-(--color-primary) shadow-[2px_2px_0_0_#000]'
                  }`}
                >
                  {card.card_name}
                </button>
              ))}
            </div>
            {billingPreview && (
              <p className="mt-1.5 text-xs font-bold border-l-4 border-black pl-2">{billingPreview}</p>
            )}
          </div>

          {/* Merchant input + autocomplete */}
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-wide mb-2">Comercio (opcional)</p>
            <input
              type="text"
              value={merchant}
              onChange={e => handleMerchantChange(e.target.value)}
              placeholder="Rappi, Uber, Netflix…"
              className="w-full border-2 border-black px-3 py-2 text-sm font-bold outline-none focus:shadow-[2px_2px_0_0_#000] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all bg-white"
            />
            {merchantSuggestions.length > 0 && merchant === '' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {merchantSuggestions.map(s => (
                  <button
                    key={s.merchant}
                    onClick={() => { setMerchant(s.merchant); setMerchantSuggestions([]); }}
                    className="px-2.5 py-1 bg-black text-white text-xs font-bold hover:bg-(--color-primary) hover:text-black transition-colors"
                  >
                    {s.merchant}
                  </button>
                ))}
              </div>
            )}
            {merchantSuggestions.length > 0 && merchant !== '' && (
              <ul className="absolute z-10 w-full bg-white border-2 border-black shadow-[4px_4px_0_0_#000] mt-1 overflow-hidden">
                {merchantSuggestions.map(s => (
                  <li key={s.merchant} className="border-b border-black/20 last:border-b-0">
                    <button
                      className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-(--color-primary) transition-colors"
                      onClick={() => { setMerchant(s.merchant); setMerchantSuggestions([]); }}
                    >
                      {s.merchant}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Match con expense del budget */}
          {matchedExpense && !confirmedMatch && (
            <div className="border-2 border-black bg-(--color-primary) p-3 flex items-start gap-3">
              <span className="mt-0.5">🎯</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">
                  ¿Asignar a <strong>{matchedExpense.name}</strong> ({matchedExpense.section})?
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setMatchedExpense(null)}
                  className="text-xs font-bold px-2 py-0.5 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
                >No</button>
                <button
                  onClick={() => setConfirmedMatch(true)}
                  className="text-xs font-bold px-2 py-0.5 border-2 border-black bg-black text-white hover:bg-gray-800 transition-colors"
                >Sí</button>
              </div>
            </div>
          )}
          {matchedExpense && confirmedMatch && (
            <div className="border-2 border-black bg-green-400 px-3 py-2 flex items-center gap-2 text-sm font-bold">
              <span>✓</span>
              <span>Vinculado a <strong>{matchedExpense.name}</strong></span>
              <button onClick={() => { setConfirmedMatch(false); setMatchedExpense(null); }}
                className="ml-auto text-xs font-bold px-1.5 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors">✕</button>
            </div>
          )}

          {/* Toggle auto-create */}
          {!matchedExpense && merchant.trim().length > 0 && (
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCreateExpense}
                onChange={(e) => setAutoCreateExpense(e.target.checked)}
                className="border-2 border-black"
              />
              <span>
                Crear como nuevo expense en{' '}
                <span className="underline">General expenses</span>
              </span>
            </label>
          )}

          {/* Billing conflict dialog */}
          {billingConflict && (
            <div className="border-2 border-black bg-(--color-primary) p-3 space-y-2">
              <p className="text-sm font-bold">¿A qué ciclo pertenece este gasto?</p>
              <div className="flex gap-2">
                {billingConflict.options.map(opt => (
                  <button
                    key={`${opt.billing_month}-${opt.billing_year}`}
                    onClick={() => setChosenBilling(opt)}
                    className={`flex-1 py-1.5 text-sm font-bold border-2 border-black transition-colors ${
                      chosenBilling?.billing_month === opt.billing_month && chosenBilling?.billing_year === opt.billing_year
                        ? 'bg-black text-white'
                        : 'bg-white hover:bg-(--color-accent)'
                    }`}
                  >
                    {monthLabel(opt.billing_month, opt.billing_year)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm font-bold text-red-600 border-l-4 border-red-600 pl-2">{error}</p>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 py-2.5 border-2 border-black text-sm font-bold bg-white hover:bg-(--color-primary) shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              Guardar y otro
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 py-2.5 border-2 border-black text-sm font-bold bg-black text-white hover:bg-gray-800 shadow-[2px_2px_0_0_#ffdb33] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {/* Hints de teclado */}
          <p className="text-center text-xs text-gray-500 font-bold">
            Enter · Guardar &nbsp;|&nbsp; ⌘Enter · Guardar y otro &nbsp;|&nbsp; Esc · Cerrar
          </p>
        </div>
      </div>
    </div>
  );
}
