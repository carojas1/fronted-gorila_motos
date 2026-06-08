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

/* ── Health check (keep-alive para Render) ──────────────────────────────────
   GET /tipos es un endpoint liviano con CORS. El actuator (/actuator/health)
   está fuera del filtro CORS de Spring Security → CORS error en el navegador.
   ──────────────────────────────────────────────────────────────────────────── */
export const healthApi = {
  check: () => api.get('/tipos'),
};
