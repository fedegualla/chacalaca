import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereRol } from "../middleware/auth.js";

export const productosRouter = Router();
const soloAdmin = requiereRol("admin");

// GET /api/productos?q=&categoria_id= — listado para el panel admin (el router
// padre ya exige requiereAuth, staff).
productosRouter.get("/", async (req, res) => {
  const { q = "", categoria_id = "" } = req.query;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre,
              COALESCE(SUM(s.cantidad), 0) AS stock_total,
              COUNT(DISTINCT v.id) AS cantidad_variantes
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN variantes_producto v ON v.producto_id = p.id
       LEFT JOIN stock s ON s.variante_id = v.id
       WHERE p.nombre ILIKE '%' || $1 || '%'
         AND ($2 = '' OR p.categoria_id = $2::int)
       GROUP BY p.id, c.nombre
       ORDER BY p.creado_en DESC`,
      [q, categoria_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/:id — detalle con variantes, stock por sucursal e imágenes
productosRouter.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    const producto = rows[0];
    if (!producto) return res.status(404).json({ error: "Producto no encontrado." });

    const { rows: variantes } = await pool.query(
      `SELECT v.*, COALESCE(
                (SELECT json_agg(json_build_object('sucursal_id', s.sucursal_id, 'cantidad', s.cantidad))
                 FROM stock s WHERE s.variante_id = v.id),
                '[]'
              ) AS stock
       FROM variantes_producto v
       WHERE v.producto_id = $1
       ORDER BY v.talle, v.color`,
      [req.params.id]
    );

    const { rows: imagenes } = await pool.query(
      "SELECT * FROM imagenes_producto WHERE producto_id = $1 ORDER BY orden",
      [req.params.id]
    );

    res.json({ ...producto, variantes, imagenes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos
// body: { nombre, descripcion?, categoria_id?, marca?, precio_costo?, precio_venta, imagen_url?, destacado? }
productosRouter.post("/", soloAdmin, async (req, res) => {
  const { nombre, descripcion, categoria_id, marca, precio_costo = 0, precio_venta, imagen_url, destacado = false } = req.body;
  if (!nombre || precio_venta === undefined) {
    return res.status(400).json({ error: "Nombre y precio de venta son obligatorios." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO productos (nombre, descripcion, categoria_id, marca, precio_costo, precio_venta, imagen_url, destacado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nombre, descripcion || null, categoria_id || null, marca || null, precio_costo, precio_venta, imagen_url || null, destacado]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/:id
productosRouter.put("/:id", soloAdmin, async (req, res) => {
  const { nombre, descripcion, categoria_id, marca, precio_costo, precio_venta, imagen_url, destacado, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE productos SET
         nombre = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion),
         categoria_id = COALESCE($3, categoria_id),
         marca = COALESCE($4, marca),
         precio_costo = COALESCE($5, precio_costo),
         precio_venta = COALESCE($6, precio_venta),
         imagen_url = COALESCE($7, imagen_url),
         destacado = COALESCE($8, destacado),
         activo = COALESCE($9, activo),
         actualizado_en = now()
       WHERE id = $10 RETURNING *`,
      [nombre, descripcion, categoria_id, marca, precio_costo, precio_venta, imagen_url, destacado, activo, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Producto no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/productos/:id — baja lógica, conserva el historial de pedidos
productosRouter.delete("/:id", soloAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE productos SET activo = false WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- IMÁGENES ----------

productosRouter.post("/:id/imagenes", soloAdmin, async (req, res) => {
  const { url, orden = 0 } = req.body;
  if (!url) return res.status(400).json({ error: "Falta la url de la imagen." });
  try {
    const { rows } = await pool.query(
      "INSERT INTO imagenes_producto (producto_id, url, orden) VALUES ($1,$2,$3) RETURNING *",
      [req.params.id, url, orden]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

productosRouter.delete("/imagenes/:imagenId", soloAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM imagenes_producto WHERE id = $1", [req.params.imagenId]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- VARIANTES (talle + color) Y STOCK ----------

// POST /api/productos/:id/variantes
// body: { talle, color, sku? }
productosRouter.post("/:id/variantes", soloAdmin, async (req, res) => {
  const { talle, color, sku } = req.body;
  if (!talle || !color) return res.status(400).json({ error: "Talle y color son obligatorios." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO variantes_producto (producto_id, talle, color, sku)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, talle, color, sku || null]
    );
    const variante = rows[0];

    // Crea la fila de stock (en 0) para cada sucursal activa, así el panel
    // de stock ya la muestra lista para cargar cantidades.
    const { rows: sucursales } = await client.query("SELECT id FROM sucursales WHERE activa = true");
    for (const s of sucursales) {
      await client.query(
        "INSERT INTO stock (variante_id, sucursal_id, cantidad) VALUES ($1,$2,0)",
        [variante.id, s.id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(variante);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ya existe una variante con ese talle y color." });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

productosRouter.put("/variantes/:varianteId", soloAdmin, async (req, res) => {
  const { talle, color, sku, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE variantes_producto SET
         talle = COALESCE($1, talle),
         color = COALESCE($2, color),
         sku = COALESCE($3, sku),
         activo = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [talle, color, sku, activo, req.params.varianteId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Variante no encontrada." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

productosRouter.delete("/variantes/:varianteId", soloAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE variantes_producto SET activo = false WHERE id = $1", [req.params.varianteId]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/variantes/:varianteId/stock
// body: { sucursal_id, cantidad } — fija la cantidad absoluta (ajuste de stock)
productosRouter.put("/variantes/:varianteId/stock", soloAdmin, async (req, res) => {
  const { sucursal_id, cantidad } = req.body;
  if (sucursal_id === undefined || cantidad === undefined || cantidad < 0) {
    return res.status(400).json({ error: "sucursal_id y cantidad (>= 0) son obligatorios." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO stock (variante_id, sucursal_id, cantidad) VALUES ($1,$2,$3)
       ON CONFLICT (variante_id, sucursal_id) DO UPDATE SET cantidad = EXCLUDED.cantidad
       RETURNING *`,
      [req.params.varianteId, sucursal_id, cantidad]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
