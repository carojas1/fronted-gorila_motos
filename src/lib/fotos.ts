/* ─────────────────────────────────────────────
   GMotors — Fotos de motos (local, sin servidor)
   Comprime la imagen y la guarda como base64 en el
   navegador. Funciona SIEMPRE (no depende de Supabase).
   Para una versión compartida en la nube se requiere
   columna TEXT en la BD (ver memoria del proyecto).
   ───────────────────────────────────────────── */

const FOTOS_KEY = 'gm_moto_fotos';

export function loadFotos(): Record<number, string> {
  try { return JSON.parse(localStorage.getItem(FOTOS_KEY) ?? '{}'); }
  catch { return {}; }
}

export function fotoDeMoto(idMoto: number): string | null {
  return loadFotos()[idMoto] ?? null;
}

export function guardarFoto(idMoto: number, dataUrl: string): void {
  try {
    const all = loadFotos();
    all[idMoto] = dataUrl;
    localStorage.setItem(FOTOS_KEY, JSON.stringify(all));
  } catch (e) {
    // Si se llena el localStorage, ignorar silenciosamente
    console.warn('No se pudo guardar la foto localmente', e);
  }
}

export function quitarFoto(idMoto: number): void {
  const all = loadFotos();
  delete all[idMoto];
  localStorage.setItem(FOTOS_KEY, JSON.stringify(all));
}

/** Imagen a mostrar para una moto: local primero, luego la del servidor. */
export function imagenMoto(moto: { id_moto: number; ruta_imagen_motos?: string | null }): string | null {
  const local = fotoDeMoto(moto.id_moto);
  if (local) return local;
  const r = moto.ruta_imagen_motos;
  if (r && r !== 'Desconocido' && r.trim() !== '') return r;
  return null;
}

/** Comprime un File a un JPEG base64 pequeño (máx ~720px, calidad 0.7). */
export function comprimirImagen(file: File, maxLado = 720, calidad = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas no disponible')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', calidad));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
