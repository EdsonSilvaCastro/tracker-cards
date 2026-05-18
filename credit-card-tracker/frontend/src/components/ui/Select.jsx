import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom NeoBrutalism Select dropdown.
 * Props:
 *   value      – current selected value
 *   onChange   – (value) => void
 *   options    – [{ value, label }]
 *   className  – extra wrapper classes
 *   placeholder – shown when no value matches
 */
export function Select({ value, onChange, options = [], className = '', placeholder = '—' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border-2 border-black text-sm font-bold shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-left"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="absolute z-50 w-full top-full left-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] max-h-56 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm font-bold hover:bg-(--color-primary) transition-colors ${
                  String(opt.value) === String(value) ? 'bg-(--color-primary)' : ''
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
