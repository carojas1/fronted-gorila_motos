/* ─────────────────────────────────────────────────────────────
   useServerStatus — Poll del backend hasta que despierte.
   Render free tier duerme tras 15 min. Este hook hace un ping
   cada 8 s hasta obtener respuesta HTTP (cualquier código = vivo).
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from 'react';

export type ServerStatus = 'checking' | 'online' | 'starting';

export function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    // Usamos /api/usuarios (GET, requiere auth → 401) en lugar de /actuator/health
    // porque /api/** pasa por el filtro CORS de Spring Security y siempre incluye
    // el header Access-Control-Allow-Origin. El actuator está fuera de ese filtro
    // y Chrome bloquea su respuesta con CORS error aunque devuelva 200.
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined)
      ?? 'https://backend-gorila-motos.onrender.com/api';

    let dead    = false;
    let retryId = 0 as unknown as ReturnType<typeof setTimeout>;

    const attempt = () => {
      if (dead) return;
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 12_000); // 12 s por intento

      fetch(`${apiBase}/usuarios`, { signal: ctrl.signal })
        .then(r => {
          clearTimeout(tid);
          if (dead) return;
          // Cualquier respuesta HTTP (200, 401, 403…) = servidor despierto con CORS
          if (r.status > 0) setStatus('online');
          else { setStatus('starting'); retryId = setTimeout(attempt, 8_000); }
        })
        .catch(() => {
          clearTimeout(tid);
          if (dead) return;
          // CORS block, timeout o red caída → servidor dormido → reintentar
          setStatus('starting');
          retryId = setTimeout(attempt, 8_000);
        });
    };

    attempt();
    return () => { dead = true; clearTimeout(retryId); };
  }, []);

  return status;
}
