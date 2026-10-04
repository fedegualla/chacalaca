-- =========================================================
-- Chacalaca - Sistema de gestión de stock y ventas
-- Esquema de base de datos PostgreSQL (un solo local)
-- =========================================================

CREATE TYPE rol_usuario AS ENUM ('admin', 'vendedor');

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL DEFAULT 'vendedor',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CATEGORÍAS ----------

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0
);

-- ---------- PRODUCTOS Y VARIANTES (talle/color) ----------

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  marca VARCHAR(100),
  precio_costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_nombre ON productos (lower(nombre));

-- Cada combinación talle+color de un producto es una variante con su propio stock.
CREATE TABLE variantes_producto (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talle VARCHAR(20) NOT NULL,
  color VARCHAR(50) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (producto_id, talle, color)
);

CREATE INDEX idx_variantes_producto ON variantes_producto(producto_id);

-- Historial de movimientos de stock: ventas, ingresos de mercadería y ajustes
-- manuales. Sirve para auditar por qué cambió el stock de una variante.
CREATE TYPE tipo_movimiento_stock AS ENUM ('ingreso', 'ajuste', 'venta', 'devolucion');

CREATE TABLE movimientos_stock (
  id SERIAL PRIMARY KEY,
  variante_id INTEGER NOT NULL REFERENCES variantes_producto(id) ON DELETE CASCADE,
  tipo tipo_movimiento_stock NOT NULL,
  cantidad INTEGER NOT NULL, -- positivo (ingreso/devolución) o negativo (venta/ajuste a la baja)
  motivo VARCHAR(255),
  usuario_id INTEGER REFERENCES usuarios(id),
  venta_id INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_variante ON movimientos_stock(variante_id, creado_en);

-- ---------- VENTAS ----------

CREATE TYPE forma_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta_mp', 'qr_mp');

-- Efectivo/transferencia quedan "aprobado" al toque (el vendedor cobra en el momento).
-- tarjeta_mp/qr_mp arrancan "pendiente" hasta que el webhook de Mercado Pago confirma el cobro.
CREATE TYPE estado_pago_venta AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE estado_venta AS ENUM ('completada', 'cancelada');

CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  cliente_nombre VARCHAR(150),
  cliente_telefono VARCHAR(50),
  subtotal NUMERIC(12,2) NOT NULL,
  descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  forma_pago forma_pago NOT NULL,
  estado_pago estado_pago_venta NOT NULL DEFAULT 'pendiente',
  estado_venta estado_venta NOT NULL DEFAULT 'completada',
  mp_preference_id VARCHAR(100),
  mp_payment_id VARCHAR(100),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_estado_pago ON ventas(estado_pago);
CREATE INDEX idx_ventas_mp_payment_id ON ventas(mp_payment_id);

CREATE TABLE venta_items (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  variante_id INTEGER NOT NULL REFERENCES variantes_producto(id),
  producto_nombre VARCHAR(200) NOT NULL, -- copia al momento de vender, por si el producto cambia después
  talle VARCHAR(20) NOT NULL,
  color VARCHAR(50) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL
);

-- ---------- CONFIGURACIÓN GENERAL ----------

CREATE TABLE configuracion (
  clave VARCHAR(100) PRIMARY KEY,
  valor VARCHAR(255) NOT NULL
);

INSERT INTO configuracion (clave, valor) VALUES
  ('nombre_tienda', 'Chacalaca'),
  ('direccion_local', 'Dirección a completar'),
  ('telefono_local', ''),
  ('cuit', ''),
  ('descuento_efectivo_transferencia', '0'),  -- % de descuento por pagar en efectivo/transferencia
  ('ancho_ticket', '80'),                     -- ancho del papel de ticket en mm (58 o 80)
  ('mensaje_pie_ticket', '¡Gracias por tu compra!'),
  ('stock_minimo_default', '3');              -- usado para alertas de stock bajo si la variante no define el propio
