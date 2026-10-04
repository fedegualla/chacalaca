# Chacalaca

Sistema de tienda de ropa: catálogo online con carrito y checkout (Mercado Pago o efectivo/transferencia), cuentas de cliente con historial de pedidos, pantalla de venta rápida para el local, y panel de administración (productos con talles/colores y stock, pedidos, categorías, configuración).

## Stack

- Backend: Node + Express + PostgreSQL
- Frontend: React + Vite

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
   Abre en http://localhost:5173 (con proxy a la API en :4000).

## Rutas principales

- `/` — tienda online (catálogo, carrito, checkout)
- `/ingresar` — login / registro de clientes
- `/mi-cuenta/pedidos` — historial de pedidos del cliente
- `/staff/login` — ingreso del personal
- `/staff/venta` — pantalla de venta rápida (POS)
- `/staff/admin` — panel de administración (solo rol admin)

## Deploy

Pensado para desplegar en Render con `render.yaml` (un solo Web Service que sirve el build del frontend + la base de datos Postgres). Variables de entorno necesarias: ver `backend/.env.example`.
