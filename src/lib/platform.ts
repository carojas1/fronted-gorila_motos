/* ─────────────────────────────────────────────
   GMotors — Detección de plataforma
   Permite servir una UI distinta en el APK (nativo) sin tocar la web.
   ───────────────────────────────────────────── */
import { Capacitor } from '@capacitor/core';

/** true cuando la app corre dentro del APK (Android/iOS), false en la web. */
export const isNativeApp: boolean = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();
