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
    // Derivar el origen real (quitar el sufijo /api si existe)
    const raw    = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://backend-gorila-motos.onrender.com/api';
    const origin = raw.replace(/\/api\/?$/, '');

    let dead    = false;
    let retryId = 0 as unknown as ReturnType<typeof setTimeout>;

    const attempt = () => {
      if (dead) return;
      const ctrl = new AbortController();
      // Abort si no responde en 12 s
      const tid = setTimeout(() => ctrl.abort(), 12_000);

      fetch(`${origin}/actuator/health`, { signal: ctrl.signal })
        .then(r => {
          clearTimeout(tid);
          if (dead) return;
          // Cualquier respuesta HTTP = servidor despierto
          if (r.ok || r.status === 401 || r.status === 403) {
            setStatus('online');
          } else {
            setStatus('starting');
            retryId = setTimeout(attempt, 8_000);
          }
        })
        .catch((e: Error) => {
          clearTimeout(tid);
          if (dead) return;
          setStatus('starting');
          // Reintento cada 8 s (incluyendo tras AbortError = timeout)
          retryId = setTimeout(attempt, 8_000);
        });
    };

    attempt();
    return () => { dead = true; clearTimeout(retryId); };
  }, []);

  return status;
}
