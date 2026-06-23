/* ─────────────────────────────────────────────
   GMotors — Captura de fotos
   - En el APK (Capacitor) usa la cámara/galería nativa con permisos.
   - En la web usa el <input type=file> normal (fallback).
   Devuelve siempre un dataURL JPEG comprimido listo para guardar en la BD.
   ───────────────────────────────────────────── */

import { Capacitor } from '@capacitor/core';

/** ¿Estamos corriendo dentro del APK nativo? */
export function esNativo(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/**
 * Abre la cámara o galería nativa y devuelve un dataURL JPEG (máx ~720px).
 * Solo debe llamarse cuando esNativo() === true.
 * Lanza si el usuario cancela o no concede permisos.
 */
export async function tomarFotoNativa(origen: 'camara' | 'galeria' | 'preguntar' = 'preguntar'): Promise<string> {
  // Import dinámico: el plugin solo existe en el bundle nativo.
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  // Verificar y solicitar permiso ANTES de abrir cámara para evitar error silencioso
  const perm = await Camera.checkPermissions();
  if (perm.camera !== 'granted') {
    const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    if (result.camera !== 'granted') {
      throw new Error('Permiso de cámara denegado. Ve a Configuración > Gorila Motos > Permisos para activarla.');
    }
  }

  const source =
    origen === 'camara'  ? CameraSource.Camera  :
    origen === 'galeria' ? CameraSource.Photos   :
                           CameraSource.Prompt;

  const foto = await Camera.getPhoto({
    quality:      70,
    width:        720,
    allowEditing: false,
    resultType:   CameraResultType.DataUrl,   // devuelve "data:image/jpeg;base64,..."
    source,
    promptLabelHeader:  'Foto de tu moto',
    promptLabelPhoto:   'Elegir de la galería',
    promptLabelPicture: 'Tomar foto',
    promptLabelCancel:  'Cancelar',
  });

  if (!foto.dataUrl) throw new Error('No se obtuvo la imagen');
  return foto.dataUrl;
}
