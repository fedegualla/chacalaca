import { Router } from "express";
import { pool } from "../db/pool.js";
import { consultarPago, validarFirmaWebhook } from "../services/mercadopago.js";
import { revertirStockPedido } from "./pedidos.js";

export const mercadopagoRouter = Router();

// Mercado Pago llama a esta URL sola, sin token nuestro, cada vez que hay
// novedades de un pago. Acá es donde "se entera" el sistema de que entró la
// plata, sin que nadie tenga que ir a mirar la app de MP.
// POST /api/mercadopago/webhook
mercadopagoRouter.post("/webhook", async (req, res) => {
  const tipo = req.query.type || req.body?.type;
  const dataId = req.query["data.id"] || req.body?.data?.id;

  if (tipo !== "payment" || !dataId) {
    return res.sendStatus(200);
  }

  const firmaValida = validarFirmaWebhook({
    xSignature: req.headers["x-signature"],
    xRequestId: req.headers["x-request-id"],
    dataId
  });
  if (!firmaValida) {
    return res.sendStatus(401);
  }

  try {
    const pago = await consultarPago(dataId);
    const pedidoId = pago.external_reference;
    if (!pedidoId) return res.sendStatus(200);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT * FROM pedidos WHERE id = $1 FOR UPDATE", [pedidoId]);
      const pedido = rows[0];

      // Pedido inexistente, o ya resuelto antes (reintento del webhook): no hacemos nada más.
      if (!pedido || pedido.estado_pago !== "pendiente") {
        await client.query("ROLLBACK");
        return res.sendStatus(200);
      }

      if (pago.status === "approved") {
        await client.query(
          "UPDATE pedidos SET estado_pago = 'aprobado', estado_pedido = 'confirmado', mp_payment_id = $1 WHERE id = $2",
          [String(pago.id), pedidoId]
        );
      } else if (["rejected", "cancelled"].includes(pago.status)) {
        await revertirStockPedido(client, pedidoId);
        await client.query(
          "UPDATE pedidos SET estado_pago = 'rechazado', estado_pedido = 'cancelado', mp_payment_id = $1 WHERE id = $2",
          [String(pago.id), pedidoId]
        );
      }
      // Otros estados (in_process, pending) todavía no son definitivos: no tocamos el pedido.

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err.message);
    res.sendStatus(200);
  }
});
