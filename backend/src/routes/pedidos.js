import { Router } from "express";
import { pool } from "../db/pool.js";
import { crearPreferenciaPago } from "../services/mercadopago.js";
import { requiereAuth, requiereAuthCliente, authClienteOpcional } from "../middleware/auth.js";

export const pedidosRouter = Router();

const FORMAS_PAGO_MP = ["tarjeta_mp", "qr_mp"];

async function obtenerConfig(client, clave, porDefecto) {
  const { rows } = await client.query("SELECT valor FROM configuracion WHERE clave = $1", [clave]);
  const valor = Number(rows[0]?.valor);
  return Number.isFinite(valor) ? valor : porDefecto;
}

async function sucursalPorDefecto(client) {
  const { rows } = await client.query(
    "SELECT id FROM sucursales WHERE activa = true ORDER BY id LIMIT 1"
  );
  if (!rows[0]) throw new Error("No hay ninguna sucursal activa configurada.");
  return rows[0].id;
}

// Devuelve el stock de los ítems de un pedido a disponible. Se usa cuando un
// pago con Mercado Pago se rechaza/cancela, o el pedido se cancela a mano.
export async function revertirStockPedido(client, pedidoId) {
  const { rows: items } = await client.query(
    "SELECT variante_id, cantidad FROM pedido_items WHERE pedido_id = $1",
    [pedidoId]
  );
  const { rows: pedidoRows } = await client.query(
    "SELECT sucursal_id FROM pedidos WHERE id = $1",
    [pedidoId]
  );
  const sucursal_id = pedidoRows[0]?.sucursal_id;
  for (const item of items) {
    await client.query(
      "UPDATE stock SET cantidad = cantidad + $1 WHERE variante_id = $2 AND sucursal_id = $3",
      [item.cantidad, item.variante_id, sucursal_id]
    );
  }
}

// Lógica compartida entre el checkout online y la venta local del POS: valida
// stock por variante, lo descuenta, calcula totales y arma el pedido.
async function crearPedido(client, {
  origen, cliente_id, usuario_id, sucursal_id, tipo_entrega,
  nombre_contacto, telefono_contacto, direccion_envio, ciudad, provincia,
  codigo_postal, notas, forma_pago, items
}) {
  if (!items || items.length === 0) throw new Error("El pedido no tiene ítems.");
  if (!nombre_contacto || !telefono_contacto) {
    throw new Error("Faltan los datos de contacto.");
  }
  if (tipo_entrega === "envio_domicilio" && (!direccion_envio || !ciudad)) {
    throw new Error("Falta la dirección de envío.");
  }

  const aplicaDescuento = forma_pago === "efectivo" || forma_pago === "transferencia";
  const requierePago = FORMAS_PAGO_MP.includes(forma_pago);
  const descuentoPct = aplicaDescuento
    ? await obtenerConfig(client, "descuento_efectivo_transferencia", 0)
    : 0;

  let subtotal = 0;
  const itemsResueltos = [];

  for (const item of items) {
    const cantidad = Number(item.cantidad) || 1;
    const { rows } = await client.query(
      `SELECT v.id, v.talle, v.color, v.activo, p.nombre AS producto_nombre, p.precio_venta, p.activo AS producto_activo
       FROM variantes_producto v JOIN productos p ON p.id = v.producto_id
       WHERE v.id = $1 FOR UPDATE`,
      [item.variante_id]
    );
    const variante = rows[0];
    if (!variante || !variante.activo || !variante.producto_activo) {
      throw new Error(`La variante ${item.variante_id} no existe o no está disponible.`);
    }

    const { rows: stockRows } = await client.query(
      "SELECT cantidad FROM stock WHERE variante_id = $1 AND sucursal_id = $2 FOR UPDATE",
      [item.variante_id, sucursal_id]
    );
    const stockActual = stockRows[0]?.cantidad ?? 0;
    if (stockActual < cantidad) {
      throw new Error(`Sin stock suficiente de "${variante.producto_nombre}" (${variante.talle}/${variante.color}).`);
    }
    await client.query(
      "UPDATE stock SET cantidad = cantidad - $1 WHERE variante_id = $2 AND sucursal_id = $3",
      [cantidad, item.variante_id, sucursal_id]
    );

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

  let costoEnvio = 0;
  if (tipo_entrega === "envio_domicilio") {
    const costoFijo = await obtenerConfig(client, "costo_envio_fijo", 0);
    const gratisDesde = await obtenerConfig(client, "envio_gratis_desde", 0);
    costoEnvio = gratisDesde > 0 && subtotal >= gratisDesde ? 0 : costoFijo;
  }

  const totalItems = itemsResueltos.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);
  const total = totalItems + costoEnvio;

  // efectivo/transferencia: se confirma a ojo (vendedor, o por WhatsApp en online), aprobado al toque.
  // tarjeta_mp/qr_mp: pendiente hasta que el webhook de Mercado Pago confirme el cobro.
  const estadoPago = requierePago ? "pendiente" : "aprobado";

  const { rows: pedidoRows } = await client.query(
    `INSERT INTO pedidos
      (origen, cliente_id, usuario_id, sucursal_id, tipo_entrega, nombre_contacto, telefono_contacto,
       direccion_envio, ciudad, provincia, codigo_postal, notas, subtotal, costo_envio,
       descuento_porcentaje, total, forma_pago, estado_pago)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [origen, cliente_id, usuario_id, sucursal_id, tipo_entrega, nombre_contacto, telefono_contacto,
     direccion_envio || null, ciudad || null, provincia || null, codigo_postal || null, notas || null,
     subtotal, costoEnvio, descuentoPct, total, forma_pago, estadoPago]
  );
  let pedido = pedidoRows[0];

  for (const item of itemsResueltos) {
    await client.query(
      `INSERT INTO pedido_items (pedido_id, variante_id, producto_nombre, talle, color, cantidad, precio_unitario)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [pedido.id, item.variante_id, item.producto_nombre, item.talle, item.color, item.cantidad, item.precio_unitario]
    );
  }

  let mpInitPoint = null;
  if (requierePago) {
    const { preferenceId, initPoint } = await crearPreferenciaPago({
      pedidoId: pedido.id,
      total,
      descripcion: `Pedido #${pedido.id}`
    });
    mpInitPoint = initPoint;
    const { rows } = await client.query(
      "UPDATE pedidos SET mp_preference_id = $1 WHERE id = $2 RETURNING *",
      [preferenceId, pedido.id]
    );
    pedido = rows[0];
  }

  return { ...pedido, items: itemsResueltos, mp_init_point: mpInitPoint };
}

// POST /api/pedidos — checkout de la tienda online. Cliente logueado u
// opcionalmente invitado (guest checkout).
// body: { tipo_entrega, nombre_contacto, telefono_contacto, direccion_envio?, ciudad?,
//         provincia?, codigo_postal?, notas?, forma_pago, items: [{variante_id, cantidad}] }
pedidosRouter.post("/", authClienteOpcional, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sucursal_id = await sucursalPorDefecto(client);
    const pedido = await crearPedido(client, {
      origen: "online",
      cliente_id: req.cliente?.id || null,
      usuario_id: null,
      sucursal_id,
      ...req.body
    });
    await client.query("COMMIT");
    res.status(201).json(pedido);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/pedidos/local — venta rápida desde la pantalla de venta (POS), solo staff.
// body: { cliente_id?, nombre_contacto?, telefono_contacto?, forma_pago, items: [{variante_id, cantidad}] }
pedidosRouter.post("/local", requiereAuth, async (req, res) => {
  const usuario_id = req.usuario.id;
  const sucursal_id = req.usuario.sucursal_id;
  if (!sucursal_id) {
    return res.status(400).json({ error: "El usuario no tiene sucursal asignada." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pedido = await crearPedido(client, {
      origen: "local",
      cliente_id: req.body.cliente_id || null,
      usuario_id,
      sucursal_id,
      tipo_entrega: "retiro_local",
      nombre_contacto: req.body.nombre_contacto || "Consumidor final",
      telefono_contacto: req.body.telefono_contacto || "-",
      forma_pago: req.body.forma_pago,
      items: req.body.items
    });
    await client.query("COMMIT");
    res.status(201).json(pedido);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/pedidos — listado para el panel de staff (admin/vendedor)
// query: estado?, origen?, fecha?
pedidosRouter.get("/", requiereAuth, async (req, res) => {
  const { estado = "", origen = "", fecha = "" } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT pe.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
              u.nombre AS vendedor_nombre
       FROM pedidos pe
       LEFT JOIN clientes c ON c.id = pe.cliente_id
       LEFT JOIN usuarios u ON u.id = pe.usuario_id
       WHERE ($1 = '' OR pe.estado_pedido = $1::estado_pedido)
         AND ($2 = '' OR pe.origen = $2::origen_pedido)
         AND ($3 = '' OR pe.fecha::date = $3::date)
       ORDER BY pe.fecha DESC`,
      [estado, origen, fecha]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/mios — historial del cliente logueado
pedidosRouter.get("/mios", requiereAuthCliente, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY fecha DESC",
      [req.cliente.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function detallePedido(id) {
  const { rows } = await pool.query(
    `SELECT pe.*, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
            u.nombre AS vendedor_nombre
     FROM pedidos pe
     LEFT JOIN clientes c ON c.id = pe.cliente_id
     LEFT JOIN usuarios u ON u.id = pe.usuario_id
     WHERE pe.id = $1`,
    [id]
  );
  const pedido = rows[0];
  if (!pedido) return null;
  const { rows: items } = await pool.query(
    "SELECT * FROM pedido_items WHERE pedido_id = $1 ORDER BY id",
    [id]
  );
  return { ...pedido, items };
}

// GET /api/pedidos/:id — el staff ve cualquier pedido; un cliente logueado
// solo puede ver el suyo.
pedidosRouter.get("/:id", authClienteOpcional, async (req, res) => {
  try {
    const pedido = await detallePedido(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado." });

    if (req.cliente) {
      if (pedido.cliente_id !== req.cliente.id) {
        return res.status(403).json({ error: "No tenés permiso para ver este pedido." });
      }
      return res.json(pedido);
    }
    // Sin token de cliente: permitimos consulta pública del estado por id
    // (útil para la pantalla de "pago pendiente" recién hecho el checkout),
    // pero sin datos de contacto sensibles si es de otro origen.
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pedidos/:id/estado — solo staff. Cambia el estado logístico del pedido.
// body: { estado_pedido }
pedidosRouter.put("/:id/estado", requiereAuth, async (req, res) => {
  const { estado_pedido } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM pedidos WHERE id = $1 FOR UPDATE", [req.params.id]);
    const pedido = rows[0];
    if (!pedido) throw new Error("Pedido no encontrado.");

    if (estado_pedido === "cancelado" && pedido.estado_pedido !== "cancelado") {
      await revertirStockPedido(client, pedido.id);
      if (pedido.estado_pago === "pendiente") {
        await client.query("UPDATE pedidos SET estado_pago = 'rechazado' WHERE id = $1", [pedido.id]);
      }
    }

    const { rows: actualizado } = await client.query(
      "UPDATE pedidos SET estado_pedido = $1 WHERE id = $2 RETURNING *",
      [estado_pedido, req.params.id]
    );
    await client.query("COMMIT");
    res.json(actualizado[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export { crearPedido };
