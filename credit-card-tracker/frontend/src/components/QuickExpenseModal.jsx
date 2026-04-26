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

      onSaved?.();
      if (keepOpen) {
        // "Guardar y otro": limpiar campos pero mantener tarjeta
        setAmount('');
        setMerchant('');
        setMerchantSuggestions([]);
        setMatchedExpense(null);
        setConfirmedMatch(false);
        setBillingConflict(null);
        setChosenBilling(null);
        amountRef.current?.focus();
      } else {
        onClose();
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
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-900">Registrar gasto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Amount input */}
          <div className="bg-gray-50 rounded-xl py-4 px-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-light text-gray-400">$</span>
              <input
                ref={amountRef}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-4xl font-semibold text-gray-900 bg-transparent border-none outline-none w-40 text-center"
              />
            </div>
          </div>

          {/* Tarjetas — segmented buttons */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Tarjeta</p>
            <div className="flex flex-wrap gap-2">
              {activeCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => { setSelectedCard(card); setBillingConflict(null); setChosenBilling(null); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedCard?.id === card.id
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-zinc-400'
                  }`}
                >
                  {card.card_name}
                </button>
              ))}
            </div>
            {billingPreview && (
              <p className="mt-1.5 text-xs text-blue-600">{billingPreview}</p>
            )}
          </div>

          {/* Merchant input + autocomplete */}
          <div className="relative">
            <p className="text-xs font-medium text-gray-500 mb-2">Comercio (opcional)</p>
            <input
              type="text"
              value={merchant}
              onChange={e => handleMerchantChange(e.target.value)}
              placeholder="Rappi, Uber, Netflix…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            {merchantSuggestions.length > 0 && merchant === '' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {merchantSuggestions.map(s => (
                  <button
                    key={s.merchant}
                    onClick={() => { setMerchant(s.merchant); setMerchantSuggestions([]); }}
                    className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200"
                  >
                    {s.merchant}
                  </button>
                ))}
              </div>
            )}
            {merchantSuggestions.length > 0 && merchant !== '' && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                {merchantSuggestions.map(s => (
                  <li key={s.merchant}>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
              <span className="text-blue-500 mt-0.5">🎯</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-800">
                  ¿Asignar a <strong>{matchedExpense.name}</strong> ({matchedExpense.section})?
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setMatchedExpense(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >No</button>
                <button
                  onClick={() => setConfirmedMatch(true)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >Sí</button>
              </div>
            </div>
          )}
          {matchedExpense && confirmedMatch && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-green-800">
              <span>✅</span>
              <span>Vinculado a <strong>{matchedExpense.name}</strong></span>
              <button onClick={() => { setConfirmedMatch(false); setMatchedExpense(null); }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}

          {/* Billing conflict dialog */}
          {billingConflict && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">¿A qué ciclo pertenece este gasto?</p>
              <div className="flex gap-2">
                {billingConflict.options.map(opt => (
                  <button
                    key={`${opt.billing_month}-${opt.billing_year}`}
                    onClick={() => setChosenBilling(opt)}
                    className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors ${
                      chosenBilling?.billing_month === opt.billing_month && chosenBilling?.billing_year === opt.billing_year
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {monthLabel(opt.billing_month, opt.billing_year)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Guardar y otro
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {/* Hints de teclado */}
          <p className="text-center text-xs text-gray-400">
            Enter · Guardar &nbsp;|&nbsp; ⌘Enter · Guardar y otro &nbsp;|&nbsp; Esc · Cerrar
          </p>
        </div>
      </div>
    </div>
  );
}
