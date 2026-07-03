/* ─────────────────────────────────────────────
   GMotors — Tema claro / oscuro
   El tema se aplica en <html data-theme="..."> y se guarda en localStorage.
   El index.html lo aplica antes de renderizar para evitar parpadeo.
   ───────────────────────────────────────────── */
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'gm_theme';

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  try { localStorage.setItem(KEY, t); } catch { /* noop */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', t === 'light' ? '#F5F5F9' : '#0B0B0F');
  }
  // Avisar a los componentes que escuchan
  window.dispatchEvent(new CustomEvent('gm-theme', { detail: t }));
}

/** Hook: devuelve [theme, toggle]. */
export function useTheme(): [Theme, () => void] {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent).detail as Theme);
    window.addEventListener('gm-theme', onChange);
    return () => window.removeEventListener('gm-theme', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }, []);

  return [theme, toggle];
}
