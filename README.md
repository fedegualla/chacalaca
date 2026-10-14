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

## Deploy (gratis, sin perder datos)

Se usa Render para el servidor y **Neon** para la base de datos, en vez del Postgres gratis de
Render — el de Render se borra solo a los 90 días si no lo pagás; el de Neon no.

1. **Base de datos (Neon)**:
   - Creá una cuenta gratis en [neon.tech](https://neon.tech) y un proyecto nuevo.
   - Copiá el "Connection string" que te dan (incluye `?sslmode=require`).
   - Desde tu PC, con ese `DATABASE_URL` en `backend/.env`, corré `npm run migrate` y
     `npm run seed` dentro de `backend/` para crear las tablas y los usuarios iniciales.
2. **Servidor (Render)**:
   - Conectá este repositorio desde el dashboard de Render ("New" → "Blueprint") — Render lee
     `render.yaml` y crea el Web Service automáticamente (sin base de datos propia).
   - Completá en Render las variables marcadas `sync: false`:
     - `DATABASE_URL`: el connection string de Neon del paso anterior.
     - `APP_BASE_URL`: la URL que te asigna Render (ej. `https://chacalaca.onrender.com`).
     - `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`: tus credenciales de Mercado Pago.

El plan free de Render "duerme" el servicio sin tráfico y lo despierta (con demora de unos
segundos) en el primer pedido; para un local que abre a una hora fija, el primer cobro del día
puede tardar un poco más que el resto. Neon no tiene ese problema de arranque y los datos quedan
guardados indefinidamente mientras el proyecto esté dentro del límite gratuito (0.5 GB), más que
suficiente para este sistema.
