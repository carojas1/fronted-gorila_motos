/* ─────────────────────────────────────────────
   GMotors — Hook de refresco en tiempo real
   Vuelve a cargar datos automáticamente:
     · al montar
     · cada `intervalMs` (por defecto 20 s), solo si la pestaña está visible
     · al volver a enfocar la pestaña / ventana (visibilitychange + focus)
   Así, cuando un mecánico/admin agrega algo, el cliente (u otra pantalla)
   lo ve sin tener que recargar la página manualmente.
   ───────────────────────────────────────────── */

import { useEffect, useRef } from 'react';

interface Options {
  /** Milisegundos entre refrescos automáticos. Default 20 000. */
  intervalMs?: number;
  /** Si es false, no hace nada (p.ej. sin sesión). Default true. */
  enabled?: boolean;
  /** Refrescar al volver a enfocar la pestaña. Default true. */
  refetchOnFocus?: boolean;
}

/**
 * @param fetchFn  función que recarga los datos (debe ser estable, p.ej. useCallback)
 */
export function usePolling(fetchFn: () => void | Promise<void>, options: Options = {}) {
  const { intervalMs = 20_000, enabled = true, refetchOnFocus = true } = options;
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      Promise.resolve(fnRef.current()).catch(() => {});
    };

    const id = window.setInterval(run, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    if (refetchOnFocus) {
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);
    }

    return () => {
      window.clearInterval(id);
      if (refetchOnFocus) {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
      }
    };
  }, [intervalMs, enabled, refetchOnFocus]);
}
