-- ════════════════════════════════════════════════════════════════════
--  GORILA MOTOS — Reiniciar datos (empezar de 0)
--  Ejecutar en Supabase → SQL Editor.
--
--  BORRA: motos, inventario, ventas, servicios, combustible, diagnósticos,
--         alertas, rutas, mantenimientos y comprobantes.
--  CONSERVA: usuarios, roles y la asignación de roles (usuario_rol),
--            tipos de servicio y los parámetros de mantenimiento (config).
--
--  ⚠️ Esta acción NO se puede deshacer. Haz un respaldo si tienes dudas.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- TRUNCATE en cascada respeta las llaves foráneas automáticamente y
-- RESTART IDENTITY reinicia los contadores (los IDs vuelven a empezar en 1).
TRUNCATE TABLE
  detalles_factura,
  facturas,
  registros,
  carga_combustible,
  detalle_diagnostico,
  diagnostico_moto,
  mantenimiento_realizado,
  alerta_enviada,
  rutas,
  productos,
  motos
RESTART IDENTITY CASCADE;

-- ── Opcionales: descomenta si TAMBIÉN quieres borrar estos datos ──
-- Categorías de inventario (si las quieres volver a crear desde cero):
-- TRUNCATE TABLE categorias RESTART IDENTITY CASCADE;
-- Contactos de proveedores guardados:
-- TRUNCATE TABLE contacto_proveedor RESTART IDENTITY CASCADE;
-- Tokens de recuperación de contraseña pendientes:
-- TRUNCATE TABLE recuperacion_contrasena RESTART IDENTITY CASCADE;

COMMIT;

-- ── Asegura que la columna de foto acepte imágenes base64 (TEXT) ──
-- (Inofensivo si ya es TEXT.)
ALTER TABLE motos
  ALTER COLUMN ruta_imagen_motos TYPE TEXT;

-- ── Verificación: todas deben quedar en 0 ──
SELECT 'motos'             AS tabla, COUNT(*) AS filas FROM motos
UNION ALL SELECT 'productos',               COUNT(*) FROM productos
UNION ALL SELECT 'registros',               COUNT(*) FROM registros
UNION ALL SELECT 'facturas',                COUNT(*) FROM facturas
UNION ALL SELECT 'detalles_factura',        COUNT(*) FROM detalles_factura
UNION ALL SELECT 'carga_combustible',       COUNT(*) FROM carga_combustible
UNION ALL SELECT 'diagnostico_moto',        COUNT(*) FROM diagnostico_moto
UNION ALL SELECT 'mantenimiento_realizado', COUNT(*) FROM mantenimiento_realizado
UNION ALL SELECT 'alerta_enviada',          COUNT(*) FROM alerta_enviada
-- Estas se conservan (deben mantener sus filas):
UNION ALL SELECT 'usuarios (se conservan)', COUNT(*) FROM usuarios
UNION ALL SELECT 'roles (se conservan)',    COUNT(*) FROM roles;
