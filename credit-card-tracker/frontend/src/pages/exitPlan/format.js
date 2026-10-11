import { idxToYm } from '@/lib/exitPlan';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const mxnFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export const mxn = (n) => mxnFmt.format(Math.round(n));
export const mxnSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + mxnFmt.format(Math.abs(Math.round(n)));
export const mxnK = (n) => `$${(n / 1000).toFixed(1)}k`;

export const mesLargo = (idx) => `${MESES[idx % 12]} ${Math.floor(idx / 12)}`;
export const mesCorto = (idx) => `${MESES_CORTO[idx % 12]} ${Math.floor(idx / 12)}`;
export const mesAbrev = (idx) => MESES_CORTO[idx % 12];
export const ymLargo = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
};
export { idxToYm };

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Texto de una fecha de escenario: { tipo, mes } → "Abr 2027" | "Hoy" | "Sin fecha"
export const fechaTexto = (f) => (f.tipo === 'hoy' ? 'Hoy' : f.tipo === 'sin' ? 'Sin fecha' : mesCorto(f.mes));

// Acepta "$1,234", "1 234", "-500". Vacío → null.
export const parseMoney = (s) => {
  const t = String(s ?? '').replace(/[^\d.-]/g, '');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
