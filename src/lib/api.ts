/* ─────────────────────────────────────────────
   GMotors — Capa de acceso a API
   Axios + interceptores de JWT
   ───────────────────────────────────────────── */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 65_000,   // Render free tier puede tardar ~50s en despertar
  headers: { 'Content-Type': 'application/json' },
});

/* ── Request interceptor: adjunta JWT (excepto endpoints públicos) ── */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('gm_token');
    const url   = config.url ?? '';
    // No enviar token en auth endpoints — un JWT expirado haría que Spring
    // Security rechace el login antes de llegar al permitAll()
    const isPublic =
      url === '/usuarios/login' ||
      (url === '/usuarios' && config.method?.toLowerCase() === 'post') ||
      url.includes('/recuperacion');
    if (token && !isPublic && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

/* ── Response interceptor: manejo global de errores ── */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // Solo forzar logout si había una sesión activa — evita redirect al intentar login
    if (err.response?.status === 401 && localStorage.getItem('gm_token')) {
      localStorage.removeItem('gm_token');
      localStorage.removeItem('gm_user');
      window.dispatchEvent(new Event('gm:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/* ── Endpoints de autenticación ── */
export const authApi = {
  login:    (correo: string, contrasena: string) =>
    api.post('/usuarios/login', { correo, contrasena }),
  register: (data: Record<string, unknown>) =>
    api.post('/usuarios', data),
  recover:  (correo: string) =>
    api.post('/usuarios/recuperacion/solicitar', { correo }),
  resetPassword: (token: string, nueva_contrasena: string) =>
    api.post('/usuarios/recuperacion/restablecer', { token, nueva_contrasena }),
};

/* ── Usuarios ── */
export const usuariosApi = {
  list:    ()             => api.get('/usuarios'),
  get:     (id: number)  => api.get(`/usuarios/${id}`),
  update:  (id: number, data: Record<string, unknown>) => api.put(`/usuarios/${id}`, data),
  remove:  (id: number)  => api.delete(`/usuarios/${id}`),
  upload:  (form: FormData) =>
    api.post('/usuarios/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

/* ── Motos ── */
export const motosApi = {
  list:      ()            => api.get('/motos'),
  get:       (id: number)  => api.get(`/motos/${id}`),
  byUser:    (uid: number) => api.get(`/motos/usuario/${uid}`),
  create:    (data: Record<string, unknown>) => api.post('/motos', data),
  update:    (id: number, data: Record<string, unknown>) => api.put(`/motos/${id}`, data),
  remove:    (id: number)  => api.delete(`/motos/${id}`),
  /** Sube foto al storage Supabase → devuelve { url } */
  upload:    (form: FormData) =>
    api.post('/motos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

/* ── Registros ── */
export const registrosApi = {
  list:    ()            => api.get('/registros'),
  get:     (id: number)  => api.get(`/registros/${id}`),
  create:  (data: Record<string, unknown>) => api.post('/registros', data),
  update:  (id: number, data: Record<string, unknown>) => api.put(`/registros/${id}/factura`, data),
  estado:  (id: number, estado: number) => api.patch(`/registros/${id}/estado`, { estado }),
  remove:  (id: number)  => api.delete(`/registros/${id}`),
};

/* ── Productos ── */
export const productosApi = {
  list:   ()            => api.get('/productos'),
  get:    (id: number)  => api.get(`/productos/${id}`),
  create: (data: Record<string, unknown>) => api.post('/productos', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/productos/${id}`, data),
  remove: (id: number)  => api.delete(`/productos/${id}`),
  upload: (form: FormData) =>
    api.post('/productos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

/* ── Categorías ── */
export const categoriasApi = {
  list:   ()            => api.get('/categorias'),
  create: (data: Record<string, unknown>) => api.post('/categorias', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/categorias/${id}`, data),
  remove: (id: number)  => api.delete(`/categorias/${id}`),
};

/* ── Roles ── */
export const rolesApi = {
  list:   () => api.get('/rol'),
  assign: (usuarioId: number, rolId: number, adminId: number) =>
    api.post('/usuario_rol/asignar', { usuarioId, rolId, adminId }),
  revoke: (usuarioId: number, rolId: number, adminId: number) =>
    api.delete('/usuario_rol/revocar', { data: { usuarioId, rolId, adminId } }),
  /** Reemplaza el rol actual por nuevoRolId (un solo rol activo al salir). */
  cambiarCategoria: (usuarioId: number, nuevoRolId: number, adminId: number) =>
    api.post('/usuario_rol/cambiar-categoria', { usuarioId, nuevoRolId, adminId }),
};

/* ── Tipos de servicio ── */
export const tiposApi = {
  list:   ()            => api.get('/tipos'),
  get:    (id: number)  => api.get(`/tipos/${id}`),
  create: (data: Record<string, unknown>) => api.post('/tipos', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/tipos/${id}`, data),
  remove: (id: number)  => api.delete(`/tipos/${id}`),
};

/* ── Facturas ── */
export const facturasApi = {
  list:   ()            => api.get('/facturas'),
  get:    (id: number)  => api.get(`/facturas/${id}`),
  create: (data: Record<string, unknown>) => api.post('/facturas', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/facturas/${id}`, data),
};

/* ── Detalles de factura ── */
export const detallesFacturaApi = {
  byFactura: (id: number) => api.get(`/detalles-factura/factura/${id}`),
  create:    (data: Record<string, unknown>) => api.post('/detalles-factura', data),
  remove:    (id: number) => api.delete(`/detalles-factura/${id}`),
};

/* ── Rutas GPS ── */
export const rutasApi = {
  list:   ()            => api.get('/rutas'),
  get:    (id: number)  => api.get(`/rutas/${id}`),
  create: (data: Record<string, unknown>) => api.post('/rutas', data),
  remove: (id: number)  => api.delete(`/rutas/${id}`),
};

/* ── Diagnósticos mecánicos ── */
export const diagnosticosApi = {
  create:     (data: Record<string, unknown>) => api.post('/diagnosticos', data),
  byMoto:     (idMoto: number)     => api.get(`/diagnosticos/moto/${idMoto}`),
  byMecanico: (idMecanico: number) => api.get(`/diagnosticos/mecanico/${idMecanico}`),
  get:        (id: number)         => api.get(`/diagnosticos/${id}`),
};

/* ── Alertas y estado de mantenimiento ── */
export const alertasApi = {
  estadoMoto: (idMoto: number) => api.get(`/alertas/moto/${idMoto}`),
  verificar:  (idMoto: number) => api.post(`/alertas/verificar/${idMoto}`, {}),
};

/* ── Mantenimientos realmente realizados (compartido entre usuarios) ── */
export const mantenimientosApi = {
  byMoto:   (idMoto: number) => api.get(`/mantenimientos/moto/${idMoto}`),
  registrar:(data: { id_moto: number; tipo: string; km_servicio: number }) =>
    api.post('/mantenimientos', { idMoto: data.id_moto, tipo: data.tipo, kmServicio: data.km_servicio }),
  borrar:   (idMoto: number, tipo: string) => api.delete(`/mantenimientos/moto/${idMoto}/${tipo}`),
};

/* ── Health check (keep-alive para Render) ──────────────────────────────────
   GET /tipos es un endpoint liviano con CORS. El actuator (/actuator/health)
   está fuera del filtro CORS de Spring Security → CORS error en el navegador.
   ──────────────────────────────────────────────────────────────────────────── */
export const healthApi = {
  /** /health es público (sin auth) → no provoca 401 aunque el token esté vencido. */
  check: () => api.get('/health'),
  /** Ping con timeout largo — despierta Render si estaba dormido. */
  wake:  () => api.get('/health', { timeout: 65_000 }),
};

/* ── Upload con retry: despierta backend si está dormido y reintenta ─────────
   Render free duerme tras 15 min. Primera petición tarda 30-50s.
   Estrategia: ping → upload con timeout 90s → reintenta 2 veces si falla.
   ──────────────────────────────────────────────────────────────────────────── */
export async function uploadWithRetry(
  endpoint: '/motos/upload' | '/usuarios/upload' | '/productos/upload',
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt === 1) onProgress?.('Despertando servidor…');
      else onProgress?.(`Reintentando (${attempt}/3)…`);

      // Ping al backend en attempt 1 para despertarlo
      if (attempt === 1) {
        try { await healthApi.wake(); } catch { /* puede fallar la primera vez */ }
      }

      onProgress?.('Subiendo imagen…');
      const { data } = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90_000,
      });
      return (data as { url: string }).url;

    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 3_000));
    }
  }
  throw new Error('Upload falló después de 3 intentos');
}
