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

/** Mensajes amigables para errores de Firebase Auth */
const FIREBASE_MSGS: Record<string, string> = {
  'auth/unauthorized-domain':       'Este dominio no está autorizado. Usa gmotors-frontend.vercel.app',
  'auth/popup-blocked':             'El navegador bloqueó el popup de Google. Permite popups e intenta de nuevo.',
  'auth/popup-closed-by-user':      'Cerraste la ventana de Google antes de completar.',
  'auth/cancelled-popup-request':   'Solo puede haber una ventana de Google abierta a la vez.',
  'auth/user-not-found':            'No existe cuenta con ese correo.',
  'auth/wrong-password':            'Contraseña incorrecta.',
  'auth/email-already-in-use':      'Ya existe una cuenta con ese correo.',
  'auth/invalid-email':             'Correo electrónico no válido.',
  'auth/too-many-requests':         'Demasiados intentos fallidos. Espera unos minutos.',
  'auth/network-request-failed':    'Sin conexión de red. Verifica tu internet.',
  'auth/internal-error':            'Error interno de autenticación. Intenta de nuevo.',
  'auth/invalid-credential':        'Credenciales inválidas. Intenta de nuevo.',
};

/** Extrae mensaje de error de Axios o Firebase */
export function getErrorMsg(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
      code?: string;
    };

    /* Errores de Firebase (tienen code pero no response) */
    if (e.code && e.code.startsWith('auth/')) {
      return FIREBASE_MSGS[e.code] ?? e.message ?? `Error Google: ${e.code}`;
    }

    /* Sin respuesta HTTP → problema de red o CORS */
    if (!e.response) {
      return e.message?.includes('verificado')
        ? e.message
        : 'Sin conexión. Verifica tu internet e intenta de nuevo.';
    }

    const status = e.response.status;

    if (status === 502 || status === 503 || status === 504) {
      return 'El servidor está iniciando (plan gratuito). Espera unos segundos e intenta de nuevo.';
    }
    if (status === 401) {
      return 'Correo o contraseña incorrectos.';
    }
    if (status === 403) {
      return 'No tienes permiso para realizar esta acción.';
    }
    if (status === 404) {
      return 'Recurso no encontrado.';
    }
    if (status && status >= 500) {
      return 'Error interno del servidor. Por favor intenta más tarde.';
    }

    return e.response?.data?.message ?? e.message ?? 'Error inesperado';
  }
  if (typeof err === 'string') return err;
  return 'Error inesperado';
}
