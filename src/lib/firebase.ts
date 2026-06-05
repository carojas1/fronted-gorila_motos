/* ─────────────────────────────────────────────
   GMotors — Firebase Auth
   Verificación de correo + Google OAuth
   ───────────────────────────────────────────── */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type ActionCodeSettings,
} from 'firebase/auth';

/* ── Config desde variables de entorno ── */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? '',
};

/* ── Inicializar solo una vez y de forma segura ── */
let app;
let authInstance = null;
let providerInstance = null;
let isEnabled = false;

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
    isEnabled = true;
  }
} catch (error) {
  console.warn("⚠️ No se pudo inicializar Firebase. Revisa las variables de entorno.", error);
}

export const auth = authInstance as ReturnType<typeof getAuth>;
export const googleProvider = providerInstance as GoogleAuthProvider;

/** ¿Está Firebase configurado y funcionando? */
export const firebaseEnabled = isEnabled;

/* ─────────────────────────────────────────────
   Helpers de autenticación
   ───────────────────────────────────────────── */

const ACTION_CODE_SETTINGS: ActionCodeSettings = {
  url: `${window.location.origin}/login?verified=1`,
  handleCodeInApp: false,
};

/**
 * Registrar usuario en Firebase y enviar email de verificación.
 * Retorna el usuario Firebase (sin email verificado aún).
 */
export async function firebaseRegister(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
  return cred.user;
}

/**
 * Reenviar email de verificación al usuario actualmente logueado en Firebase.
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión Firebase activa');
  await sendEmailVerification(user, ACTION_CODE_SETTINGS);
}

/**
 * Verificar si el usuario tiene el email confirmado.
 * Recarga el estado desde Firebase primero.
 */
export async function checkEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return user.emailVerified;
}

/**
 * Login con Google OAuth (popup).
 * Retorna { email, displayName, uid }.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign-in básico con email + password en Firebase (para verificar estado).
 */
export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Cerrar sesión de Firebase.
 */
export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Observer de estado Firebase (útil para sync).
 */
export { onAuthStateChanged, type FirebaseUser };
