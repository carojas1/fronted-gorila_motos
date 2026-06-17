/* ─────────────────────────────────────────────
   GMotors — Fotos de motos (100% nube)
   La foto se guarda en la BD (columna ruta_imagen_motos, TEXT)
   vía motosApi.update. Aquí solo se comprime y se decide qué mostrar.
   No se usa almacenamiento local (la app será un APK).
   ───────────────────────────────────────────── */

/** Imagen a mostrar para una moto (la de la BD). */
export function imagenMoto(moto: { ruta_imagen_motos?: string | null }): string | null {
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
