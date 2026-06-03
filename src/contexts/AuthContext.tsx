/* ─────────────────────────────────────────────
   GMotors — Auth Context
   JWT + usuario en localStorage
   ───────────────────────────────────────────── */

import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react';
import { authApi } from '../lib/api';
import type { Usuario } from '../types';

interface AuthState {
  user:    Usuario | null;
  token:   string  | null;
  loading: boolean;
}

/** Roles canónicos del sistema. */
export type RoleName = 'ADMIN' | 'MECANICO' | 'CLIENTE';

interface AuthCtx extends AuthState {
  login:  (correo: string, contrasena: string) => Promise<void>;
  logout: () => void;
  isAdmin:   boolean;
  isMecanico: boolean;
  isCliente:  boolean;
  /** ¿El usuario actual tiene alguno de los roles indicados? */
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

  /* Escucha 401 global del interceptor de Axios */
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('gm:unauthorized', handler);
    return () => window.removeEventListener('gm:unauthorized', handler);
  }, []);

  const login = useCallback(async (correo: string, contrasena: string) => {
    setState((s) => ({ ...s, loading: true }));
    try {
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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  /* Normaliza los roles del backend a un Set de nombres canónicos.
     El backend devuelve roles en varias formas: string, { nombre }, o { rol: { nombre } }. */
  const roleNames = new Set<string>(
    (state.user?.roles ?? [])
      .map((r) => {
        if (typeof r === 'string') return r;
        const obj = r as { nombre?: string; rol?: { nombre?: string } };
        return obj.rol?.nombre ?? obj.nombre ?? '';
      })
      .filter((n) => typeof n === 'string' && n.trim().length > 0)
      .map((n) => String(n).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  const hasRole = (...roles: RoleName[]) =>
    roles.some((r) => roleNames.has(r));

  // Forzar Admin si el usuario tiene rol ADMIN, o si su nombre o correo coinciden con el jefe (Andres/Admin)
  const isBoss = state.user?.nombre_completo?.toLowerCase().includes('andres') || 
                 state.user?.correo?.toLowerCase().includes('admin');
  
  const isAdmin    = roleNames.has('ADMIN') || isBoss;
  const isMecanico = roleNames.has('MECANICO');
  const isCliente  = roleNames.has('CLIENTE');

  return (
    <AuthContext.Provider value={{
      ...state, login, logout,
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
