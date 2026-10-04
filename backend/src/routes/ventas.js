import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereAdmin } from "../middleware/auth.js";
import { registrarMovimiento } from "../services/stock.js";
import {
  crearPreferenciaPago,
  generarQrDataUrl,
  buscarUltimoPagoPorReferencia
} from "../services/mercadopago.js";

export const ventasRouter = Router();

const FORMAS_PAGO_MP = ["tarjeta_mp", "qr_mp"];

async function obtenerDescuentoConfigurado(client) {
  const { rows } = await client.query(
    "SELECT valor FROM configuracion WHERE clave = 'descuento_efectivo_transferencia'"
  );
  const valor = Number(rows[0]?.valor);
  return Number.isFinite(valor) ? valor : 0;
}

// Revierte al stock los ítems de una venta (cancelación, o pago de Mercado
// Pago rechazado). Queda registrado como movimiento tipo "devolución".
export async function revertirStockVenta(client, ventaId, usuarioId) {
  const { rows: items } = await client.query(
    "SELECT variante_id, cantidad FROM venta_items WHERE venta_id = $1",
    [ventaId]
  );
  for (const item of items) {
    await registrarMovimiento(client, {
      variante_id: item.variante_id,
      tipo: "devolucion",
      cantidad: item.cantidad,
      motivo: `Reverso de venta #${ventaId}`,
      usuario_id: usuarioId,
      venta_id: ventaId
    });
  }
}

// POST /api/ventas — venta desde la pantalla de venta (POS).
// body: { cliente_nombre?, cliente_telefono?, forma_pago, items: [{variante_id, cantidad}] }
ventasRouter.post("/", requiereAuth, async (req, res) => {
  const { cliente_nombre, cliente_telefono, forma_pago, items } = req.body;
  if (!items?.length) return res.status(400).json({ error: "La venta no tiene ítems." });

  const requierePago = FORMAS_PAGO_MP.includes(forma_pago);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const aplicaDescuento = forma_pago === "efectivo" || forma_pago === "transferencia";
    const descuentoPct = aplicaDescuento ? await obtenerDescuentoConfigurado(client) : 0;

    let subtotal = 0;
    const itemsResueltos = [];

    for (const item of items) {
      const cantidad = Number(item.cantidad) || 1;
      const { rows } = await client.query(
        `SELECT v.id, v.talle, v.color, v.activo, v.stock_actual,
                p.nombre AS producto_nombre, p.precio_venta, p.activo AS producto_activo
         FROM variantes_producto v JOIN productos p ON p.id = v.producto_id
         WHERE v.id = $1 FOR UPDATE`,
        [item.variante_id]
      );
      const variante = rows[0];
      if (!variante || !variante.activo || !variante.producto_activo) {
        throw new Error(`La variante ${item.variante_id} no existe o no está disponible.`);
      }
      if (variante.stock_actual < cantidad) {
        throw new Error(`Sin stock suficiente de "${variante.producto_nombre}" (${variante.talle}/${variante.color}).`);
      }

      const precioLista = Number(variante.precio_venta);
      const precioUnitario = aplicaDescuento ? precioLista * (1 - descuentoPct / 100) : precioLista;
      subtotal += precioLista * cantidad;

      itemsResueltos.push({
        variante_id: variante.id,
        producto_nombre: variante.producto_nombre,
        talle: variante.talle,
        color: variante.color,
        cantidad,
        precio_unitario: precioUnitario
      });
    }

    const total = itemsResueltos.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);
    // efectivo/transferencia: se confirma al toque. tarjeta_mp/qr_mp: pendiente
    // hasta que Mercado Pago confirme el cobro (webhook o verificación manual).
    const estadoPago = requierePago ? "pendiente" : "aprobado";

    const { rows: ventaRows } = await client.query(
      `INSERT INTO ventas (usuario_id, cliente_nombre, cliente_telefono, subtotal,
         descuento_porcentaje, total, forma_pago, estado_pago)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.usuario.id, cliente_nombre || null, cliente_telefono || null, subtotal, descuentoPct, total, forma_pago, estadoPago]
    );
    let venta = ventaRows[0];

    for (const item of itemsResueltos) {
      await client.query(
        `INSERT INTO venta_items (venta_id, variante_id, producto_nombre, talle, color, cantidad, precio_unitario)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [venta.id, item.variante_id, item.producto_nombre, item.talle, item.color, item.cantidad, item.precio_unitario]
      );
      await registrarMovimiento(client, {
        variante_id: item.variante_id,
        tipo: "venta",
        cantidad: -item.cantidad,
        motivo: `Venta #${venta.id}`,
        usuario_id: req.usuario.id,
        venta_id: venta.id
      });
    }

    let mpInitPoint = null;
    let mpQrDataUrl = null;
    if (requierePago) {
      const { preferenceId, initPoint } = await crearPreferenciaPago({
        ventaId: venta.id,
        total,
        descripcion: `Venta #${venta.id}`
      });
      mpInitPoint = initPoint;
      if (forma_pago === "qr_mp" && initPoint) {
        mpQrDataUrl = await generarQrDataUrl(initPoint);
      }
      const { rows } = await client.query(
        "UPDATE ventas SET mp_preference_id = $1 WHERE id = $2 RETURNING *",
        [preferenceId, venta.id]
      );
      venta = rows[0];
    }

    await client.query("COMMIT");
    res.status(201).json({ ...venta, items: itemsResueltos, mp_init_point: mpInitPoint, mp_qr_data_url: mpQrDataUrl });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/ventas — historial, con filtros opcionales.
ventasRouter.get("/", requiereAuth, async (req, res) => {
  const { estado_pago = "", forma_pago = "", desde = "", hasta = "" } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT v.*, u.nombre AS vendedor_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       WHERE ($1 = '' OR v.estado_pago = $1::estado_pago_venta)
         AND ($2 = '' OR v.forma_pago = $2::forma_pago)
         AND ($3 = '' OR v.fecha::date >= $3::date)
         AND ($4 = '' OR v.fecha::date <= $4::date)
       ORDER BY v.fecha DESC
       LIMIT 300`,
      [estado_pago, forma_pago, desde, hasta]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function detalleVenta(id) {
  const { rows } = await pool.query(
    `SELECT v.*, u.nombre AS vendedor_nombre FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id WHERE v.id = $1`,
    [id]
  );
  const venta = rows[0];
  if (!venta) return null;
  const { rows: items } = await pool.query(
    "SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id",
    [id]
  );
  return { ...venta, items };
}

// GET /api/ventas/:id — detalle completo (usado también para reimprimir el ticket).
ventasRouter.get("/:id", requiereAuth, async (req, res) => {
  try {
    const venta = await detalleVenta(req.params.id);
    if (!venta) return res.status(404).json({ error: "Venta no encontrada." });
    res.json(venta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ventas/:id/verificar-pago — consulta directamente a Mercado Pago el
// estado del cobro (útil en desarrollo local, donde el webhook no llega).
ventasRouter.post("/:id/verificar-pago", requiereAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM ventas WHERE id = $1 FOR UPDATE", [req.params.id]);
    const venta = rows[0];
    if (!venta) throw new Error("Venta no encontrada.");

    if (venta.estado_pago !== "pendiente") {
      await client.query("ROLLBACK");
      return res.json(venta);
    }

    const pago = await buscarUltimoPagoPorReferencia(String(venta.id));
    if (!pago) {
      await client.query("ROLLBACK");
      return res.json(venta);
    }

    let actualizada = venta;
    if (pago.status === "approved") {
      const { rows: r } = await client.query(
        "UPDATE ventas SET estado_pago = 'aprobado', mp_payment_id = $1 WHERE id = $2 RETURNING *",
        [String(pago.id), venta.id]
      );
      actualizada = r[0];
    } else if (["rejected", "cancelled"].includes(pago.status)) {
      await revertirStockVenta(client, venta.id, req.usuario.id);
      const { rows: r } = await client.query(
        "UPDATE ventas SET estado_pago = 'rechazado', estado_venta = 'cancelada', mp_payment_id = $1 WHERE id = $2 RETURNING *",
        [String(pago.id), venta.id]
      );
      actualizada = r[0];
    }

    await client.query("COMMIT");
    res.json(actualizada);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/ventas/:id/cancelar — solo admin. Revierte el stock vendido.
ventasRouter.put("/:id/cancelar", requiereAuth, requiereAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM ventas WHERE id = $1 FOR UPDATE", [req.params.id]);
    const venta = rows[0];
    if (!venta) throw new Error("Venta no encontrada.");
    if (venta.estado_venta === "cancelada") throw new Error("La venta ya estaba cancelada.");

    await revertirStockVenta(client, venta.id, req.usuario.id);
    const estadoPago = venta.estado_pago === "aprobado" ? "aprobado" : "rechazado";
    const { rows: actualizada } = await client.query(
      "UPDATE ventas SET estado_venta = 'cancelada', estado_pago = $1 WHERE id = $2 RETURNING *",
      [estadoPago, venta.id]
    );
    await client.query("COMMIT");
    res.json(actualizada[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});
