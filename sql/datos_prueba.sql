-- ════════════════════════════════════════════════════════════════════
--  GORILA MOTOS — DATOS DE PRUEBA  (ejecutar en Supabase → SQL Editor)
--  Inserta: productos con stock lleno/medio/vacío, categorías,
--  y registros de servicio en TODOS los estados (incl. factura pagada).
--  Es idempotente en lo posible: usa lookups y evita duplicar.
--  NO toca la cuenta admin gorilamotos2026@gmail.com.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Categoría base ────────────────────────────────────────────────
INSERT INTO categorias (nombre, descripcion)
SELECT 'Repuestos', 'Repuestos y consumibles de taller'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Repuestos');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Lubricantes', 'Aceites y líquidos'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Lubricantes');

-- ── 2. Productos: stock LLENO, MEDIO y VACÍO ─────────────────────────
-- (codigo_personal es único por producto; no se duplican si ya existen)
WITH cat AS (
  SELECT
    (SELECT id_categoria FROM categorias WHERE nombre = 'Repuestos'  LIMIT 1) AS rep,
    (SELECT id_categoria FROM categorias WHERE nombre = 'Lubricantes' LIMIT 1) AS lub
)
INSERT INTO productos
  (codigo_proveedor, codigo_personal, nombre, descripcion, costo, pvp, stock,
   fecha_registro, fecha_modificacion, id_categoria, ruta_imagenproductos)
SELECT v.codigo_proveedor, v.codigo_personal, v.nombre, v.descripcion,
       v.costo, v.pvp, v.stock, CURRENT_DATE, CURRENT_DATE, v.cat, NULL
FROM cat,
  (VALUES
    -- ── STOCK LLENO ──
    ('MOTUL',   'ACE-5100-10W40', 'Aceite Motul 5100 10W40', 'Aceite semisintético 1L', 6.50, 11.00, 40, (SELECT lub FROM cat)),
    ('NGK',     'BUJ-CR8E',       'Bujía NGK CR8E',          'Bujía estándar',           2.80,  5.50, 60, (SELECT rep FROM cat)),
    ('DID',     'CAD-520-120',    'Cadena DID 520 x120',     'Cadena reforzada',        18.00, 32.00, 25, (SELECT rep FROM cat)),
    -- ── STOCK MEDIO (≤5, dispara alerta amarilla) ──
    ('MICHELIN','LLA-120-70-17',  'Llanta Michelin 120/70-17','Llanta delantera',        45.00, 78.00,  4, (SELECT rep FROM cat)),
    ('BREMBO',  'PAS-FR-CB300',   'Pastillas freno CB300',   'Juego delantero',         14.00, 26.00,  3, (SELECT rep FROM cat)),
    -- ── STOCK VACÍO (0, dispara alerta roja) ──
    ('K&N',     'FIL-AIR-MT07',   'Filtro de aire K&N MT-07','Alto flujo lavable',      22.00, 38.00,  0, (SELECT rep FROM cat)),
    ('CASTROL', 'ACE-POWER1-4T',  'Castrol Power1 4T 10W40', 'Aceite full sintético 1L', 8.50, 14.00,  0, (SELECT lub FROM cat))
  ) AS v(codigo_proveedor, codigo_personal, nombre, descripcion, costo, pvp, stock, cat)
WHERE NOT EXISTS (
  SELECT 1 FROM productos p WHERE p.codigo_personal = v.codigo_personal
);

-- ── 3. Registros de servicio en TODOS los estados ───────────────────
-- Requiere: un cliente (rol CLIENTE), un admin/mecánico, un tipo y una moto.
-- Si falta alguno, el bloque no inserta (no rompe).
-- Estados: 0=Pendiente 1=EnProceso 2=Completado 3=Entregado 4=Facturado(pagado)
DO $$
DECLARE
  v_cliente   BIGINT;
  v_encargado BIGINT;
  v_tipo      BIGINT;
  v_moto      BIGINT;
  v_factura   BIGINT;
  v_estado    INT;
  v_montos    NUMERIC[] := ARRAY[25.00, 40.00, 55.00, 70.00, 95.50];
  v_obs       TEXT[]    := ARRAY[
    'Ingreso para diagnóstico — el cliente reporta ruido en motor',
    'Cambio de aceite y filtro en proceso',
    'Mantenimiento preventivo completado, listo para entrega',
    'Moto entregada al cliente tras revisión general',
    'Servicio facturado y pagado — cambio de pastillas + aceite'
  ];
BEGIN
  -- Cliente: el primer usuario con rol CLIENTE (vía usuario_rol → rol)
  SELECT u.id_usuario INTO v_cliente
  FROM usuarios u
  WHERE u.correo <> 'gorilamotos2026@gmail.com'
  ORDER BY u.id_usuario
  LIMIT 1;

  -- Encargado: el admin
  SELECT id_usuario INTO v_encargado FROM usuarios WHERE correo = 'gorilamotos2026@gmail.com' LIMIT 1;
  IF v_encargado IS NULL THEN
    SELECT id_usuario INTO v_encargado FROM usuarios ORDER BY id_usuario LIMIT 1;
  END IF;

  -- Tipo de servicio
  SELECT id_tipo INTO v_tipo FROM tipos ORDER BY id_tipo LIMIT 1;

  -- Moto: una del cliente, o cualquiera
  SELECT id_moto INTO v_moto FROM motos WHERE id_usuario = v_cliente ORDER BY id_moto LIMIT 1;
  IF v_moto IS NULL THEN
    SELECT id_moto INTO v_moto FROM motos ORDER BY id_moto LIMIT 1;
  END IF;

  IF v_cliente IS NULL OR v_encargado IS NULL OR v_tipo IS NULL OR v_moto IS NULL THEN
    RAISE NOTICE 'Faltan datos base (cliente/encargado/tipo/moto). No se crearon registros.';
    RETURN;
  END IF;

  -- Un registro por cada estado 0..4, cada uno con su factura
  FOR v_estado IN 0..4 LOOP
    INSERT INTO facturas (fecha_emision, id_usuario, costo_total)
    VALUES (CURRENT_DATE - v_estado, v_cliente, v_montos[v_estado + 1])
    RETURNING id_factura INTO v_factura;

    INSERT INTO registros
      (fecha, observaciones, estado, kilometraje, id_factura, id_encargado, id_cliente, id_tipo, id_moto)
    VALUES
      (CURRENT_DATE - v_estado, v_obs[v_estado + 1], v_estado, 12000 + v_estado * 800,
       v_factura, v_encargado, v_cliente, v_tipo, v_moto);
  END LOOP;

  RAISE NOTICE 'Listo: 5 registros (estados 0-4) + 7 productos + 2 categorías.';
END $$;

-- ── 4. Verificación ──────────────────────────────────────────────────
SELECT 'productos' AS tabla, COUNT(*) FROM productos
UNION ALL SELECT 'registros', COUNT(*) FROM registros
UNION ALL SELECT 'facturas',  COUNT(*) FROM facturas;
