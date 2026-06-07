/* ─────────────────────────────────────────────
   GMotors — Firebase Auth
   signInWithRedirect (evita errores COOP en Vercel)
   ───────────────────────────────────────────── */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type ActionCodeSettings,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? '',
};

let app;
let authInstance = null;
let providerInstance = null;
let isEnabled = false;

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
    providerInstance.setCustomParameters({ prompt: 'select_account' });
    isEnabled = true;
  }
} catch (error) {
  console.warn('⚠️ Firebase no disponible:', error);
}

export const auth          = authInstance as ReturnType<typeof getAuth>;
export const googleProvider = providerInstance as GoogleAuthProvider;
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
 * Iniciar Google Sign-In con REDIRECT (evita errores COOP en Vercel/hosting).
 * La página redirige a Google → vuelve al mismo URL de origen.
 * Después de volver, llama `getGoogleRedirectUser()` para obtener el usuario.
 */
export async function startGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Obtener el resultado de Google redirect.
 * Llama esto en el useEffect del LoginPage después de volver del redirect.
 * Devuelve null si no hay resultado pendiente.
 */
export async function getGoogleRedirectUser(): Promise<FirebaseUser | null> {
  try {
    if (!auth) return null;
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
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
