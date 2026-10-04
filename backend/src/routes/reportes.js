import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth } from "../middleware/auth.js";

export const reportesRouter = Router();

// GET /api/reportes/resumen — números para el dashboard del día.
reportesRouter.get("/resumen", requiereAuth, async (req, res) => {
  try {
    const { rows: hoyRows } = await pool.query(
      `SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(total), 0) AS total
       FROM ventas
       WHERE fecha::date = CURRENT_DATE AND estado_venta = 'completada' AND estado_pago != 'rechazado'`
    );
    const { rows: porFormaPago } = await pool.query(
      `SELECT forma_pago, COUNT(*)::int AS cantidad, COALESCE(SUM(total), 0) AS total
       FROM ventas
       WHERE fecha::date = CURRENT_DATE AND estado_venta = 'completada' AND estado_pago != 'rechazado'
       GROUP BY forma_pago`
    );
    const { rows: masVendidos } = await pool.query(
      `SELECT vi.producto_nombre, vi.talle, vi.color, SUM(vi.cantidad)::int AS cantidad_vendida
       FROM venta_items vi
       JOIN ventas v ON v.id = vi.venta_id
       WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days' AND v.estado_venta = 'completada'
       GROUP BY vi.producto_nombre, vi.talle, vi.color
       ORDER BY cantidad_vendida DESC
       LIMIT 10`
    );
    const { rows: stockBajoRows } = await pool.query(
      `SELECT COUNT(*)::int AS cantidad FROM variantes_producto v
       JOIN productos p ON p.id = v.producto_id
       WHERE v.activo = true AND p.activo = true AND v.stock_actual <= v.stock_minimo`
    );
    const { rows: pendientesRows } = await pool.query(
      "SELECT COUNT(*)::int AS cantidad FROM ventas WHERE estado_pago = 'pendiente'"
    );

    res.json({
      ventas_hoy: hoyRows[0],
      por_forma_pago_hoy: porFormaPago,
      mas_vendidos_30d: masVendidos,
      variantes_stock_bajo: stockBajoRows[0].cantidad,
      pagos_pendientes: pendientesRows[0].cantidad
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
