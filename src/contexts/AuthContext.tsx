/* ─────────────────────────────────────────────
   GMotors — Auth Context
   JWT + Firebase Auth (redirect, no popup)
   ───────────────────────────────────────────── */

import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode,
} from 'react';
import { authApi } from '../lib/api';
import type { Usuario } from '../types';
import {
  firebaseEnabled,
  firebaseSignOut,
  type FirebaseUser,
} from '../lib/firebase';

interface AuthState {
  user:    Usuario | null;
  token:   string  | null;
  loading: boolean;
}

export type RoleName = 'ADMIN' | 'MECANICO' | 'CLIENTE';

interface AuthCtx extends AuthState {
  login:              (correo: string, contrasena: string) => Promise<void>;
  /** Procesa un FirebaseUser de Google y crea/inicia sesión en el backend. */
  processGoogleUser?: (fbUser: FirebaseUser) => Promise<void>;
  logout:             () => void;
  isAdmin:    boolean;
  isMecanico: boolean;
  isCliente:  boolean;
  hasRole: (...roles: RoleName[]) => boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

const TOKEN_KEY = 'gm_token';
const USER_KEY  = 'gm_user';

/* Extrae token + usuario de cualquier estructura de respuesta del backend */
function extractAuth(data: Record<string, unknown>) {
  const token = (data.token ?? data.jwt ?? data.accessToken) as string | undefined;
  const user  = (data.usuario ?? data.user ?? (data.id ? data : undefined)) as Usuario | undefined;
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:    JSON.parse(localStorage.getItem(USER_KEY)  ?? 'null'),
    token:   localStorage.getItem(TOKEN_KEY),
    loading: false,
  });

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('gm:unauthorized', handler);
    return () => window.removeEventListener('gm:unauthorized', handler);
  }, []);

  /**
   * Al montar, refrescar los roles del usuario desde el backend.
   * IMPORTANTE: usa fetch nativo (NO axios) para evitar que el interceptor
   * de axios dispare un logout si el token está expirado.
   * Un 401/403/404 simplemente se ignora → el usuario sigue con roles guardados.
   * El logout solo ocurre si el usuario hace una acción real (API call con axios).
   */
  useEffect(() => {
    const token   = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (!token || !userStr) return;

    let stored: { id_usuario?: number } | null;
    try { stored = JSON.parse(userStr); } catch { return; }
    if (!stored?.id_usuario) return;

    const API = (import.meta.env.VITE_API_URL as string | undefined)
      ?? 'https://backend-gorila-motos.onrender.com/api';

    // Guard de cancelación: si el usuario hace logout o inicia sesión con OTRA
    // cuenta antes de que llegue esta respuesta, no pisar el estado con datos viejos.
    let cancelled = false;
    const idEsperado = stored.id_usuario;

    fetch(`${API}/usuarios/${stored.id_usuario}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) return; // token expirado / servidor dormido → mantener datos guardados
        const data = await res.json() as Record<string, unknown>;
        if (cancelled) return; // respuesta tardía: el contexto ya cambió
        // Solo aplicar si la sesión vigente sigue siendo la misma cuenta
        const tokenVigente = localStorage.getItem(TOKEN_KEY);
        if (!tokenVigente || tokenVigente !== token) return;
        if (data?.id_usuario === idEsperado) {
          delete data.contrasena; // nunca guardar hash en localStorage
          localStorage.setItem(USER_KEY, JSON.stringify(data));
          setState(s => ({ ...s, user: data as unknown as Usuario }));
        }
      })
      .catch(() => {}); // red caída o backend dormido → mantener datos guardados

    return () => { cancelled = true; };
  }, []); // solo al montar

  /* ── Login con email + contraseña (backend directo, sin Firebase) ── */
  const login = useCallback(async (correo: string, contrasena: string) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await authApi.login(correo, contrasena);
      const { token, user } = extractAuth(data);
      if (!token || !user) throw new Error('Respuesta del servidor inválida. Intenta nuevamente.');
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY,  JSON.stringify(user));
      setState({ user, token, loading: false });
    } catch (err) {
      setState((s) => ({ ...s, loading: false }));
      throw err;
    }
  }, []);

  /**
   * Procesa el FirebaseUser obtenido tras Google redirect.
   * Intenta login con contraseña determinista; si falla, auto-registra.
   * No abre popup — el redirect ya fue manejado por LoginPage.
   */
  const processGoogleUserCb = useCallback(async (fbUser: FirebaseUser) => {
        setState((s) => ({ ...s, loading: true }));
        try {
          /* Admin usa contraseña fija; otros Google-users usan su UID */
          const googlePass = fbUser.email === 'gorilamotos2026@gmail.com'
            ? 'Gorilamotos.2026.cuenca'
            : `gm_google_${fbUser.uid.slice(0, 16)}`;
          let token: string | undefined;
          let user:  Usuario | undefined;

          /* 1. Login directo con contraseña determinista */
          try {
            const { data } = await authApi.login(fbUser.email!, googlePass);
            ({ token, user } = extractAuth(data));
          } catch (loginErr: unknown) {
            const st = (loginErr as { response?: { status?: number } })?.response?.status;
            // Si el backend NO respondió (red caída / Render dormido) o dio 5xx,
            // NO asumir "primera vez" ni registrar: es un fallo del servidor.
            if (st === undefined) {
              throw new Error('No se pudo conectar con el servidor. Intenta de nuevo en un momento.', { cause: loginErr });
            }
            if (st >= 500) {
              throw new Error('El servidor tuvo un problema temporal. Intenta de nuevo.', { cause: loginErr });
            }
            /* 2. 4xx (usuario no existe / credencial google no aplica) → registrar */
            const base = (fbUser.email!.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 14) || 'gmuser');
            try {
              await authApi.register({
                nombre_completo: fbUser.displayName || base,
                nombre_usuario:  `${base}_g`,
                correo:          fbUser.email!,
                contrasena:      googlePass,
                descripcion:     'CEDULA: N/A | TELEFONO: N/A',
                pais:            'Ecuador',
                ciudad:          'Ecuador',
              });
            } catch (regErr: unknown) {
              const status = (regErr as { response?: { status: number } })?.response?.status;
              if (status === 409 || status === 400) {
                /* El correo ya existe con diferente contraseña */
                throw new Error(
                  'Este correo ya tiene cuenta. Ingresa con tu contraseña normal ' +
                  'o usa "¿Olvidaste tu contraseña?" para restablecerla.',
                  { cause: regErr }
                );
              }
              throw regErr;
            }
            /* 3. Registro OK → login con la nueva cuenta */
            const { data } = await authApi.login(fbUser.email!, googlePass);
            ({ token, user } = extractAuth(data));
          }

          /* Validar que recibimos sesión válida */
          if (!token || !user) {
            throw new Error('El servidor no devolvió una sesión válida. Intenta nuevamente.');
          }

          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY,  JSON.stringify(user));
          setState({ user, token, loading: false });
        } catch (err) {
          await firebaseSignOut().catch(() => {});
          setState((s) => ({ ...s, loading: false }));
          throw err;
        }
      }, []);
  /* Solo se expone si Firebase está configurado (mantiene la semántica previa) */
  const processGoogleUser = firebaseEnabled ? processGoogleUserCb : undefined;

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, loading: false });
    if (firebaseEnabled) firebaseSignOut().catch(() => {});
  }, []);

  const roleNames = new Set<string>(
    (state.user?.roles ?? [])
      .map((r) => {
        if (typeof r === 'string') return r;
        const obj = r as { nombre?: string; rol?: { nombre?: string } };
        return obj.rol?.nombre ?? obj.nombre ?? '';
      })
      .filter((n) => typeof n === 'string' && n.trim().length > 0)
      .map((n) => String(n).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
  );

  const hasRole    = (...roles: RoleName[]) => roles.some((r) => roleNames.has(r));
  const isAdmin    = roleNames.has('ADMIN');
  const isMecanico = roleNames.has('MECANICO');
  const isCliente  = roleNames.has('CLIENTE');

  return (
    <AuthContext.Provider value={{
      ...state, login, processGoogleUser, logout,
      isAdmin, isMecanico, isCliente, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
