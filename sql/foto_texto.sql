-- ════════════════════════════════════════════════════════════════════
--  GORILA MOTOS — Permitir fotos en base de datos
--  Ejecutar UNA vez en Supabase → SQL Editor.
--  La columna de foto es varchar(255) y no le cabe una imagen base64.
--  La pasamos a TEXT (sin límite). La tabla de mantenimientos se crea
--  sola al redesplegar el backend (no necesita SQL).
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE motos
  ALTER COLUMN ruta_imagen_motos TYPE TEXT;

-- Verificación
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'motos' AND column_name = 'ruta_imagen_motos';
