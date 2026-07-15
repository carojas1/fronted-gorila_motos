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
import { isNativeApp } from '../lib/platform';

interface Options {
  /** Milisegundos entre refrescos automáticos. Default 20 000 (40 000 en APK). */
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
  const {
    /* En APK reducimos frecuencia para no saturar el WebView ni despertar Render */
    intervalMs = isNativeApp ? 45_000 : 20_000,
    enabled = true,
    refetchOnFocus = true,
  } = options;
  const fnRef    = useRef(fetchFn);
  const running  = useRef(false); // evita llamadas solapadas
  const lastRun  = useRef(0);
  fnRef.current  = fetchFn;

  // El plan gratuito mide toda la salida. Este minimo evita descargas
  // repetidas de las mismas tablas desde varias pantallas a la vez.
  const effectiveInterval = Math.max(intervalMs, isNativeApp ? 180_000 : 120_000);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (running.current) return; // no solapar
      const now = Date.now();
      if (now - lastRun.current < 30_000) return;
      running.current = true;
      lastRun.current = now;
      Promise.resolve(fnRef.current())
        .catch(() => {})
        .finally(() => { running.current = false; });
    };

    const id = window.setInterval(run, effectiveInterval);

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
  }, [effectiveInterval, enabled, refetchOnFocus]);
}
