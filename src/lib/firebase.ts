/* ─────────────────────────────────────────────
   GMotors — Firebase Auth
   Popup con COOP same-origin-allow-popups (vercel.json)
   Config embebida como fallback para cualquier deploy
   ───────────────────────────────────────────── */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type ActionCodeSettings,
} from 'firebase/auth';

/* Firebase web API keys son públicas por diseño.
   Los env vars tienen prioridad; hardcoded = fallback para Vercel sin env vars. */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || 'AIzaSyBHlT5OZdK9fqmgaXZ_s8dute-wu76Z7Dk',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || 'gorilamotos.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || 'gorilamotos',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || 'gorilamotos.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '835804873937',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || '1:835804873937:web:9d2c607d68d0ddaa28f1f0',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      || 'G-3VV4X58DKD',
};

let authInstance = null;
let providerInstance = null;
let isEnabled = false;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  authInstance = getAuth(app);
  providerInstance = new GoogleAuthProvider();
  providerInstance.setCustomParameters({ prompt: 'select_account' });
  isEnabled = true;
} catch (error) {
  console.warn('⚠️ Firebase no disponible:', error);
}

export const auth            = authInstance as ReturnType<typeof getAuth>;
export const googleProvider  = providerInstance as GoogleAuthProvider;
export const firebaseEnabled = isEnabled;

const ACTION_CODE_SETTINGS: ActionCodeSettings = {
  url: `${window.location.origin}/login?verified=1`,
  handleCodeInApp: false,
};

/** Registrar en Firebase + enviar email de verificación. */
export async function firebaseRegister(email: string, password: string): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
  return cred.user;
}

/** Reenviar email de verificación. */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión Firebase activa');
  await sendEmailVerification(user, ACTION_CODE_SETTINGS);
}

/** Verificar si el email está confirmado. */
export async function checkEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/**
 * Google Sign-In con REDIRECT — única estrategia fiable en producción.
 *
 * signInWithPopup NO se usa porque Google pone COOP en sus páginas OAuth,
 * lo que hace que Chrome genere una cascada de errores en la consola.
 * Redirect navega la pestaña completa, sin popups, sin errores COOP.
 *
 * Retorna null siempre (la página navega; resultado en getGoogleRedirectUser).
 */
export async function startGoogleSignIn(): Promise<null> {
  if (!auth) throw new Error('Firebase no disponible');
  await signInWithRedirect(auth, googleProvider);
  return null;
}

/** Alias para compatibilidad */
export async function startGoogleRedirect(): Promise<void> {
  await startGoogleSignIn();
}

/**
 * Obtiene el FirebaseUser resultante de un redirect previo.
 * Si no hay resultado (redirect no ocurrió o no completó) retorna null en silencio.
 * Solo propaga errores reales de Firebase (auth/unauthorized-domain, etc.).
 */
export async function getGoogleRedirectUser(): Promise<FirebaseUser | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // auth/no-auth-event = no había redirect → silencio total
    if (!code || code === 'auth/no-auth-event') return null;
    throw err; // unauthorized-domain y similares sí se propagan
  }
}

/** Login básico Firebase (para verificar estado de email). */
export async function firebaseSignIn(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Cerrar sesión Firebase. */
export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type FirebaseUser };
