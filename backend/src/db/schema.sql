-- =========================================================
-- Chacalaca - Sistema de tienda de ropa (online + local)
-- Esquema de base de datos PostgreSQL
-- =========================================================

-- ---------- SUCURSALES Y USUARIOS (staff) ----------

CREATE TABLE sucursales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(50),
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE rol_usuario AS ENUM ('admin', 'vendedor');

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario NOT NULL DEFAULT 'vendedor',
  sucursal_id INTEGER REFERENCES sucursales(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CLIENTES (cuentas de la tienda online) ----------

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CATEGORÍAS ----------

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icono VARCHAR(10) DEFAULT '👕',
  orden INTEGER NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true
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
  imagen_url TEXT,
  destacado BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_destacado ON productos(destacado) WHERE destacado = true;

-- Imágenes adicionales de un producto (además de la principal en productos.imagen_url)
CREATE TABLE imagenes_producto (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

-- Cada combinación talle+color de un producto es una variante con su propio stock
CREATE TABLE variantes_producto (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talle VARCHAR(20) NOT NULL,
  color VARCHAR(50) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (producto_id, talle, color)
);

CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  variante_id INTEGER NOT NULL REFERENCES variantes_producto(id) ON DELETE CASCADE,
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  cantidad INTEGER NOT NULL DEFAULT 0,
  UNIQUE (variante_id, sucursal_id)
);

-- ---------- PEDIDOS (ventas online y locales, comparten el mismo flujo) ----------

CREATE TYPE origen_pedido AS ENUM ('online', 'local');
CREATE TYPE tipo_entrega AS ENUM ('retiro_local', 'envio_domicilio');
CREATE TYPE forma_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta_mp', 'qr_mp');

-- Efectivo/transferencia quedan "aprobado" al toque (el vendedor las confirma a ojo,
-- o en el caso online se confirman por WhatsApp). tarjeta_mp/qr_mp arrancan "pendiente"
-- hasta que el webhook de Mercado Pago confirma el cobro.
CREATE TYPE estado_pago_pedido AS ENUM ('pendiente', 'aprobado', 'rechazado');

CREATE TYPE estado_pedido AS ENUM (
  'pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'
);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  origen origen_pedido NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  usuario_id INTEGER REFERENCES usuarios(id), -- vendedor que cargó la venta, si fue local
  sucursal_id INTEGER REFERENCES sucursales(id),
  tipo_entrega tipo_entrega NOT NULL DEFAULT 'retiro_local',
  nombre_contacto VARCHAR(150) NOT NULL,
  telefono_contacto VARCHAR(50) NOT NULL,
  direccion_envio VARCHAR(255),
  ciudad VARCHAR(100),
  provincia VARCHAR(100),
  codigo_postal VARCHAR(20),
  notas TEXT,
  subtotal NUMERIC(12,2) NOT NULL,
  costo_envio NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  forma_pago forma_pago NOT NULL,
  estado_pago estado_pago_pedido NOT NULL DEFAULT 'pendiente',
  estado_pedido estado_pedido NOT NULL DEFAULT 'pendiente',
  mp_preference_id VARCHAR(100),
  mp_payment_id VARCHAR(100),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id, fecha);
CREATE INDEX idx_pedidos_estado ON pedidos(estado_pedido, fecha);
CREATE INDEX idx_pedidos_mp_payment_id ON pedidos(mp_payment_id);

CREATE TABLE pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  variante_id INTEGER NOT NULL REFERENCES variantes_producto(id),
  producto_nombre VARCHAR(200) NOT NULL, -- copia al momento de vender, por si el producto cambia despues
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
  ('descuento_efectivo_transferencia', '20'),         -- % de descuento por pagar en efectivo/transferencia
  ('costo_envio_fijo', '3500'),                       -- costo de envío a domicilio
  ('envio_gratis_desde', '50000'),                    -- monto a partir del cual el envío es gratis (0 = desactivado)
  ('whatsapp_numero', '5493400000000'),               -- número para "Consultar por WhatsApp"
  ('direccion_local', 'Dirección a completar'),
  ('email_contacto', 'contacto@chacalaca.com');
