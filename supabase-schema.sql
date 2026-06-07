-- ═══════════════════════════════════════════════════════════════════════════
-- GORILA MOTOS — Schema PostgreSQL para Supabase
-- Pega este SQL en: Supabase Dashboard > SQL Editor > New query > Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Roles del sistema
CREATE TABLE IF NOT EXISTS roles (
  id_rol     BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Categorías de productos
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria BIGSERIAL PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT
);

-- 3. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      BIGSERIAL PRIMARY KEY,
  nombre_completo VARCHAR(200) NOT NULL,
  nombre_usuario  VARCHAR(100) NOT NULL UNIQUE,
  correo          VARCHAR(200) NOT NULL UNIQUE,
  contrasena      VARCHAR(500) NOT NULL,
  pais            VARCHAR(100),
  ciudad          VARCHAR(100),
  descripcion     TEXT,
  ruta_imagen     VARCHAR(500)
);

-- 4. Relación Usuario ↔ Rol
CREATE TABLE IF NOT EXISTS usuario_rol (
  id_usuario    BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_rol        BIGINT NOT NULL REFERENCES roles(id_rol)        ON DELETE CASCADE,
  id_asignador  BIGINT REFERENCES usuarios(id_usuario),
  PRIMARY KEY (id_usuario, id_rol)
);

-- 5. Motos
CREATE TABLE IF NOT EXISTS motos (
  id_moto            BIGSERIAL PRIMARY KEY,
  placa              VARCHAR(20)  NOT NULL UNIQUE,
  anio               INTEGER      NOT NULL,
  marca              VARCHAR(100) NOT NULL,
  modelo             VARCHAR(100) NOT NULL,
  nombremoto         VARCHAR(100),
  tipo_moto          VARCHAR(255) NOT NULL,
  kilometraje        INTEGER      NOT NULL DEFAULT 0,
  cilindraje         INTEGER      NOT NULL DEFAULT 0,
  id_usuario         BIGINT       NOT NULL REFERENCES usuarios(id_usuario),
  ruta_imagen_motos  VARCHAR(255) NOT NULL DEFAULT 'Desconocido'
);

-- 6. Productos (inventario)
CREATE TABLE IF NOT EXISTS productos (
  id_producto          BIGSERIAL PRIMARY KEY,
  codigo_proveedor     VARCHAR(100),
  codigo_personal      VARCHAR(100),
  nombre               VARCHAR(200) NOT NULL,
  descripcion          TEXT,
  ruta_imagenproductos VARCHAR(500),
  costo                NUMERIC(10,2) NOT NULL DEFAULT 0,
  pvp                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock                INTEGER       DEFAULT 0,
  fecha_registro       DATE,
  fecha_modificacion   DATE,
  id_categoria         BIGINT REFERENCES categorias(id_categoria)
);

-- 7. Tipos de servicio
CREATE TABLE IF NOT EXISTS tipo (
  id_tipo                  BIGSERIAL PRIMARY KEY,
  nombre                   VARCHAR(200) NOT NULL,
  descripcion              TEXT,
  id_producto              BIGINT REFERENCES productos(id_producto),
  concepto_manual          TEXT,
  concepto_cantidad        INTEGER,
  concepto_precio_unitario NUMERIC(10,2)
);

-- 8. Facturas
CREATE TABLE IF NOT EXISTS facturas (
  id_factura    BIGSERIAL PRIMARY KEY,
  fecha_emision DATE          NOT NULL,
  id_usuario    BIGINT        NOT NULL REFERENCES usuarios(id_usuario),
  costo_total   NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 9. Detalles de factura
CREATE TABLE IF NOT EXISTS detalles_factura (
  id_detalle  BIGSERIAL PRIMARY KEY,
  cantidad    INTEGER       NOT NULL,
  id_factura  BIGINT        NOT NULL REFERENCES facturas(id_factura) ON DELETE CASCADE,
  id_producto BIGINT        REFERENCES productos(id_producto),
  subtotal    NUMERIC(10,2) NOT NULL,
  descripcion VARCHAR(255)
);

-- 10. Registros de servicio (órdenes de trabajo)
CREATE TABLE IF NOT EXISTS registros (
  id_registro  BIGSERIAL PRIMARY KEY,
  fecha        DATE         NOT NULL,
  observaciones VARCHAR(300) NOT NULL,
  estado       INTEGER      NOT NULL DEFAULT 0,
  kilometraje  INTEGER,
  id_factura   BIGINT       NOT NULL REFERENCES facturas(id_factura),
  id_encargado BIGINT       NOT NULL REFERENCES usuarios(id_usuario),
  id_cliente   BIGINT       NOT NULL REFERENCES usuarios(id_usuario),
  id_tipo      BIGINT       NOT NULL REFERENCES tipo(id_tipo),
  id_moto      BIGINT       NOT NULL REFERENCES motos(id_moto)
);

-- 11. Recuperación de contraseña
CREATE TABLE IF NOT EXISTS recuperacion_contrasena (
  id              BIGSERIAL PRIMARY KEY,
  correo          VARCHAR(200) NOT NULL,
  token           VARCHAR(500) NOT NULL UNIQUE,
  fecha_expiracion TIMESTAMP   NOT NULL,
  usado           BOOLEAN      DEFAULT false
);

-- 12. Rutas GPS (módulo opcional)
CREATE TABLE IF NOT EXISTS rutas (
  id_ruta     BIGSERIAL PRIMARY KEY,
  nombre      VARCHAR(200),
  descripcion TEXT,
  id_usuario  BIGINT REFERENCES usuarios(id_usuario),
  fecha       DATE
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES (roles base del sistema)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO roles (nombre)
VALUES ('ADMIN'), ('MECANICO'), ('CLIENTE')
ON CONFLICT (nombre) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_motos_usuario    ON motos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_registros_moto   ON registros(id_moto);
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros(estado);
CREATE INDEX IF NOT EXISTS idx_productos_stock  ON productos(stock);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_usr  ON usuario_rol(id_usuario);

-- ═══════════════════════════════════════════════════════════════════════════
-- DESPUÉS DE EJECUTAR ESTE SQL:
--
-- 1. En Supabase > Settings > Database > Connection string (URI)
--    copia la URL de conexión (ej: postgresql://postgres:TU_PASSWORD@db.xxx.supabase.co:5432/postgres)
--
-- 2. En Render (backend) > Environment Variables, agrega:
--    DB_URL      = jdbc:postgresql://db.xxx.supabase.co:5432/postgres
--    DB_DRIVER   = org.postgresql.Driver
--    DB_USER     = postgres
--    DB_PASSWORD = TU_PASSWORD_DE_SUPABASE
--    DB_DIALECT  = org.hibernate.dialect.PostgreSQLDialect
--    DB_DDL      = update
--
-- 3. Haz un nuevo deploy del backend en Render
-- ═══════════════════════════════════════════════════════════════════════════
