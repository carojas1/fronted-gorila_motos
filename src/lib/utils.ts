import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases de Tailwind sin conflictos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea fecha ISO → "12 may 2025" */
export function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Formatea número como moneda */
export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(n);
}

/** Capitaliza primera letra */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Obtiene iniciales de nombre completo */
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Mapa estado de registro → texto + color */
export const ESTADO_REGISTRO: Record<number, { label: string; color: string }> = {
  0: { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700'   },
  1: { label: 'En proceso', color: 'bg-blue-100 text-blue-700'     },
  2: { label: 'Completado', color: 'bg-green-100 text-green-700'   },
  3: { label: 'Entregado',  color: 'bg-purple-100 text-purple-700' },
  4: { label: 'Facturado',  color: 'bg-teal-100 text-teal-700'     },
};

/** Extrae teléfono del campo descripcion (formato: "CEDULA: xxx | TELEFONO: xxx") */
export function extractPhone(descripcion: string | undefined | null): string | null {
  if (!descripcion) return null;
  const match = descripcion.match(/TELEFONO:\s*([^\s|]+)/i);
  return match && match[1] !== 'N/A' ? match[1] : null;
}

/** Extrae cédula del campo descripcion */
export function extractCedula(descripcion: string | undefined | null): string | null {
  if (!descripcion) return null;
  const match = descripcion.match(/CEDULA:\s*(\d+)/i);
  return match ? match[1] : null;
}

/** Genera el siguiente código secuencial de producto (formato COD-001) */
export function nextProductCode(existingCodes: string[]): string {
  const nums = existingCodes
    .filter((c) => /^COD-\d+$/i.test(c))
    .map((c) => parseInt(c.replace(/^COD-/i, ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `COD-${String(max + 1).padStart(3, '0')}`;
}

/** Debounce simple */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Extrae mensaje de error de Axios */
export function getErrorMsg(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? 'Error inesperado';
  }
  return 'Error inesperado';
}
