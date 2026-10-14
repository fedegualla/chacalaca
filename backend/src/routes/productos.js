import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereAdmin } from "../middleware/auth.js";
import { registrarMovimiento } from "../services/stock.js";

export const productosRouter = Router();

// GET /api/productos?q=&categoria_id=&soloActivos=
productosRouter.get("/", requiereAuth, async (req, res) => {
  const { q = "", categoria_id = "", soloActivos = "true" } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre,
              COALESCE(SUM(v.stock_actual), 0) AS stock_total
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN variantes_producto v ON v.producto_id = p.id AND v.activo = true
       WHERE ($1 = '' OR unaccent(p.nombre) ILIKE unaccent('%' || $1 || '%') OR unaccent(p.marca) ILIKE unaccent('%' || $1 || '%'))
         AND ($2 = '' OR p.categoria_id = $2::int)
         AND ($3 = 'false' OR p.activo = true)
       GROUP BY p.id, c.nombre
       ORDER BY p.nombre`,
      [q, categoria_id, soloActivos]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/alertas/stock-bajo
productosRouter.get("/alertas/stock-bajo", requiereAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.id AS variante_id, v.talle, v.color, v.stock_actual, v.stock_minimo,
              p.id AS producto_id, p.nombre AS producto_nombre
       FROM variantes_producto v
       JOIN productos p ON p.id = v.producto_id
       WHERE v.activo = true AND p.activo = true AND v.stock_actual <= v.stock_minimo
       ORDER BY v.stock_actual ASC, p.nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/:id
productosRouter.get("/:id", requiereAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.id = $1`,
      [req.params.id]
    );
    const producto = rows[0];
    if (!producto) return res.status(404).json({ error: "Producto no encontrado." });
    const { rows: variantes } = await pool.query(
      "SELECT * FROM variantes_producto WHERE producto_id = $1 ORDER BY talle, color",
      [req.params.id]
    );
    res.json({ ...producto, variantes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos — crea el producto y, opcionalmente, sus variantes iniciales.
// body: { nombre, descripcion?, categoria_id?, marca?, precio_costo, precio_venta,
//          variantes?: [{ talle, color, stock_actual?, stock_minimo? }] }
productosRouter.post("/", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, descripcion, categoria_id, marca, precio_costo, precio_venta, variantes = [] } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO productos (nombre, descripcion, categoria_id, marca, precio_costo, precio_venta)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre.trim(), descripcion || null, categoria_id || null, marca || null, precio_costo || 0, precio_venta || 0]
    );
    const producto = rows[0];

    for (const v of variantes) {
      if (!v.talle?.trim() || !v.color?.trim()) continue;
      const { rows: varRows } = await client.query(
        `INSERT INTO variantes_producto (producto_id, talle, color, sku, stock_minimo)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [producto.id, v.talle.trim(), v.color.trim(), v.sku || null, v.stock_minimo || 0]
      );
      const cantidadInicial = Number(v.stock_actual) || 0;
      if (cantidadInicial > 0) {
        await registrarMovimiento(client, {
          variante_id: varRows[0].id,
          tipo: "ingreso",
          cantidad: cantidadInicial,
          motivo: "Carga inicial de stock",
          usuario_id: req.usuario.id
        });
      }
    }

    await client.query("COMMIT");
    res.status(201).json(producto);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/productos/:id
productosRouter.put("/:id", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, descripcion, categoria_id, marca, precio_costo, precio_venta, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE productos SET
        nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
        categoria_id = $3, marca = COALESCE($4, marca),
        precio_costo = COALESCE($5, precio_costo), precio_venta = COALESCE($6, precio_venta),
        activo = COALESCE($7, activo), actualizado_en = now()
       WHERE id = $8 RETURNING *`,
      [nombre, descripcion, categoria_id ?? null, marca, precio_costo, precio_venta, activo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Producto no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/productos/:id — baja lógica (se mantiene el historial de ventas).
productosRouter.delete("/:id", requiereAuth, requiereAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE productos SET activo = false WHERE id = $1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos/:id/variantes — agrega una variante nueva a un producto existente.
productosRouter.post("/:id/variantes", requiereAuth, requiereAdmin, async (req, res) => {
  const { talle, color, sku, stock_actual = 0, stock_minimo = 0 } = req.body;
  if (!talle?.trim() || !color?.trim()) {
    return res.status(400).json({ error: "Talle y color son obligatorios." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO variantes_producto (producto_id, talle, color, sku, stock_minimo)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, talle.trim(), color.trim(), sku || null, stock_minimo]
    );
    const variante = rows[0];
    if (Number(stock_actual) > 0) {
      await registrarMovimiento(client, {
        variante_id: variante.id,
        tipo: "ingreso",
        cantidad: Number(stock_actual),
        motivo: "Carga inicial de stock",
        usuario_id: req.usuario.id
      });
    }
    await client.query("COMMIT");
    const { rows: actualizada } = await pool.query("SELECT * FROM variantes_producto WHERE id = $1", [variante.id]);
    res.status(201).json(actualizada[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/variantes/:id — edita datos de la variante (no el stock: eso va por /movimiento).
productosRouter.put("/variantes/:id", requiereAuth, requiereAdmin, async (req, res) => {
  const { talle, color, sku, stock_minimo, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE variantes_producto SET
        talle = COALESCE($1, talle), color = COALESCE($2, color), sku = $3,
        stock_minimo = COALESCE($4, stock_minimo), activo = COALESCE($5, activo)
       WHERE id = $6 RETURNING *`,
      [talle, color, sku ?? null, stock_minimo, activo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Variante no encontrada." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/variantes/:id/movimiento — ingreso de mercadería o ajuste manual de stock.
// body: { tipo: 'ingreso' | 'ajuste' | 'devolucion', cantidad, motivo? }
productosRouter.post("/variantes/:id/movimiento", requiereAuth, requiereAdmin, async (req, res) => {
  const { tipo, cantidad, motivo } = req.body;
  if (!["ingreso", "ajuste", "devolucion"].includes(tipo)) {
    return res.status(400).json({ error: "Tipo de movimiento inválido." });
  }
  const cant = Number(cantidad);
  if (!cant) return res.status(400).json({ error: "La cantidad no puede ser 0." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const stockActual = await registrarMovimiento(client, {
      variante_id: req.params.id,
      tipo,
      cantidad: cant,
      motivo,
      usuario_id: req.usuario.id
    });
    await client.query("COMMIT");
    res.json({ stock_actual: stockActual });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/variantes/:id/movimientos — historial de una variante puntual.
productosRouter.get("/variantes/:id/movimientos", requiereAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.nombre AS usuario_nombre FROM movimientos_stock m
       LEFT JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.variante_id = $1 ORDER BY m.creado_en DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
