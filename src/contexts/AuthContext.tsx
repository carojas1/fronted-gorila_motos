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
  checkEmailVerified,
  firebaseSignIn,
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

  /* ── Login con email + contraseña ── */
  const login = useCallback(async (correo: string, contrasena: string) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      if (firebaseEnabled) {
        try {
          await firebaseSignIn(correo, contrasena);
          const verified = await checkEmailVerified();
          await firebaseSignOut();
          if (!verified) {
            throw new Error(
              'Tu correo electrónico no ha sido verificado. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.'
            );
          }
        } catch (fbErr: unknown) {
          if (fbErr instanceof Error && fbErr.message.includes('verificado')) {
            setState((s) => ({ ...s, loading: false }));
            throw fbErr;
          }
        }
      }
      const { data } = await authApi.login(correo, contrasena);
      const token: string  = data.token ?? data.jwt ?? data.accessToken;
      const user:  Usuario = data.usuario ?? data.user ?? data;
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
  const processGoogleUser = firebaseEnabled
    ? useCallback(async (fbUser: FirebaseUser) => {
        setState((s) => ({ ...s, loading: true }));
        try {
          const googlePass = `gm_google_${fbUser.uid.slice(0, 16)}`;
          let token: string;
          let user: Usuario;

          try {
            const { data } = await authApi.login(fbUser.email!, googlePass);
            token = data.token ?? data.jwt ?? data.accessToken;
            user  = data.usuario ?? data.user ?? data;
          } catch {
            /* Primera vez con Google → auto-registrar */
            const base = fbUser.email!.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'gmuser';
            try {
              await authApi.register({
                nombre_completo: fbUser.displayName || base,
                nombre_usuario:  `${base}${Math.floor(Math.random() * 9000) + 1000}`,
                correo:          fbUser.email!,
                contrasena:      googlePass,
                descripcion:     'CEDULA: N/A | TELEFONO: N/A',
                pais:            'Ecuador',
                ciudad:          'Ecuador',
              });
            } catch (regErr: unknown) {
              const status = (regErr as { response?: { status: number } })?.response?.status;
              if (status === 409 || status === 400) {
                throw new Error(
                  'Este correo ya está registrado con otra contraseña. Inicia sesión con tu correo y contraseña habituales.'
                );
              }
              throw regErr;
            }
            const { data } = await authApi.login(fbUser.email!, googlePass);
            token = data.token ?? data.jwt ?? data.accessToken;
            user  = data.usuario ?? data.user ?? data;
          }

          await firebaseSignOut();
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY,  JSON.stringify(user));
          setState({ user, token, loading: false });
        } catch (err) {
          await firebaseSignOut().catch(() => {});
          setState((s) => ({ ...s, loading: false }));
          throw err;
        }
      }, [])
    : undefined;

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
