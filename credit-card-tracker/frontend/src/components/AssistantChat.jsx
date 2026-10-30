import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, RotateCcw } from 'lucide-react';
import { assistantApi } from '@/lib/api';

const SUGERENCIAS = [
  '¿En qué gasté más este mes?',
  '¿Qué pagos vencen esta semana?',
  'Compara este mes con el anterior',
  '¿Cómo va el uso de mis tarjetas?',
];
const MAX_HISTORY = 10;

export default function AssistantChat({ open, setOpen }) {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant' | 'error', content, retry? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = async (question, previous) => {
    const history = previous
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content }));
    setLoading(true);
    try {
      const res = await assistantApi.ask(question, history);
      setMessages((ms) => [...ms, { role: 'assistant', content: res.data.data.answer || 'No obtuve una respuesta.' }]);
    } catch (err) {
      const msg = err.response?.data?.error || (err.code === 'ECONNABORTED' ? 'La consulta tardó demasiado.' : 'No se pudo consultar al asistente.');
      setMessages((ms) => [...ms, { role: 'error', content: msg, retry: err.response?.status === 429 ? null : question }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (text) => {
    const question = text.trim();
    if (!question || loading) return;
    const previous = messages;
    setMessages([...previous, { role: 'user', content: question }]);
    setInput('');
    ask(question, previous);
  };

  const retry = (question) => {
    // Quita el error y reintenta con el historial previo a esa pregunta.
    const sinError = messages.filter((m) => m.role !== 'error');
    const idx = sinError.map((m) => m.content).lastIndexOf(question);
    setMessages(sinError);
    ask(question, sinError.slice(0, idx));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente financiero"
        className="fixed bottom-24 right-6 z-40 h-14 w-14 lg:w-auto lg:px-4 flex items-center justify-center gap-2 bg-primary text-black font-bold border-2 border-black shadow-md hover:shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
      >
        <Sparkles className="w-6 h-6" aria-hidden="true" />
        <span className="hidden lg:inline">Asistente</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Asistente financiero"
          className="fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px] z-50 bg-white border-black sm:border-l-2 sm:shadow-xl flex flex-col"
        >
          <div className="bg-primary border-b-2 border-black px-4 py-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-wider uppercase">
              <Sparkles className="w-4 h-4" aria-hidden="true" />Asistente financiero
            </h2>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button" onClick={() => !loading && setMessages([])} disabled={loading}
                  aria-label="Nueva conversación" title="Nueva conversación"
                  className="border-2 border-black bg-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-accent disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente"
                className="border-2 border-black bg-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-accent"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-100" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Pregunta lo que quieras sobre tus gastos, tarjetas y presupuesto. Consulto tus datos reales.</p>
                <div className="flex flex-col gap-2 items-start">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s} type="button" onClick={() => send(s)}
                      className="text-left text-sm border-2 border-black bg-white px-3 py-2 min-h-[44px] shadow-sm hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[92%]'}>
                <div
                  className={`border-2 border-black px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === 'user' ? 'bg-primary' : m.role === 'error' ? 'bg-[#FF6B6B] shadow-sm' : 'bg-white shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'error' && m.retry && (
                  <button
                    type="button" onClick={() => retry(m.retry)} disabled={loading}
                    className="mt-1.5 text-sm font-bold border-2 border-black bg-white px-3 py-2 min-h-[44px] hover:bg-accent disabled:opacity-60"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div role="status" className="self-start border-2 border-black bg-white shadow-sm px-3 py-2 text-sm text-muted-foreground">
                Consultando tus datos…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t-2 border-black bg-white p-3 flex gap-2 items-end"
          >
            <label htmlFor="assistant-input" className="sr-only">Tu pregunta</label>
            <textarea
              id="assistant-input" ref={inputRef} rows={1} value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta…" maxLength={4000}
              className="flex-1 resize-none border-2 border-black px-3 py-2.5 min-h-[44px] max-h-32 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <button
              type="submit" disabled={loading || !input.trim()} aria-label="Enviar pregunta"
              className="border-2 border-black bg-black text-white min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
