# Chacalaca

Sistema de gestión de stock y ventas para un local de ropa infantil: productos con talles/colores
y stock por variante, historial de movimientos de stock, pantalla de venta rápida (POS) con cobro
en efectivo, transferencia o Mercado Pago (tarjeta/QR), impresión de tickets, historial de ventas,
usuarios con roles y un dashboard con los números del día.

## Stack

- Backend: Node + Express + PostgreSQL
- Frontend: React + Vite
- Pagos: Mercado Pago (Checkout Pro — link de pago + QR)
- Tickets: se imprimen con el diálogo de impresión del navegador, en formato angosto
  (58mm/80mm, configurable), usando la impresora térmica instalada como impresora de Windows.

## Desarrollo local

1. Backend:
   ```
   cd backend
   cp .env.example .env   # completar DATABASE_URL, JWT_SECRET, etc.
   npm install
   npm run migrate        # crea las tablas
   npm run seed           # carga usuarios y productos de prueba
   npm run dev
   ```
   Usuarios de prueba: `admin@prueba.com` / `prueba123` y `vendedor@prueba.com` / `prueba123`.

2. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Abrí http://localhost:5173 (con proxy a la API en :4000).

## Mercado Pago

El cobro con tarjeta/QR se configura con variables de entorno en `backend/.env`
(ver `backend/.env.example`): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `APP_BASE_URL`
(la URL pública del backend, para que Mercado Pago le avise al webhook cuando se acredita un pago).
En desarrollo local hace falta un túnel (ngrok, cloudflared, etc.) para que el webhook llegue;
como alternativa, el botón "Verificar estado del pago" de la pantalla de venta consulta el pago
directamente a la API de Mercado Pago sin depender del webhook.

## Impresora de tickets

No hace falta ningún software extra: conectá la impresora térmica a la PC del local como una
impresora común de Windows (la mayoría de las impresoras de tickets traen su propio driver) y
elegila en el diálogo que abre el navegador al imprimir. El ancho del papel (58mm u 80mm) se
configura desde `/configuracion`.

## Rutas principales

- `/login` — ingreso del personal
- `/` — dashboard con ventas del día, pagos pendientes y stock bajo
- `/venta` — pantalla de venta rápida (POS)
- `/ventas` — historial de ventas (filtros, detalle, reimpresión de ticket)
- `/productos` — productos, talles/colores y stock
- `/categorias` — categorías de productos
- `/usuarios` — alta y baja de personal (solo admin)
- `/configuracion` — datos del local, descuentos y formato de ticket (solo admin)

## Deploy

Pensado para desplegar gratis en Render con `render.yaml` (un solo Web Service que sirve el
build del frontend + la API, más una base de datos Postgres free). Para desplegar:

1. Conectá este repositorio desde el dashboard de Render ("New" → "Blueprint") — Render lee
   `render.yaml` y crea el Web Service y la base de datos Postgres automáticamente.
2. Completá en Render las variables marcadas `sync: false` (`APP_BASE_URL` con la URL que te
   asigna Render, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).
3. Corré las migraciones contra esa base la primera vez: desde tu PC, con el `DATABASE_URL`
   externo que te muestra Render para la base de datos, ejecutá `npm run migrate` y
   `npm run seed` dentro de `backend/`.

El plan free de Render "duerme" el servicio sin tráfico y lo despierta (con demora) en el primer
pedido; para un local que usa el sistema en vivo durante el día esto puede notarse al abrir la
pantalla de venta a primera hora.
