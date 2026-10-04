import { Router } from "express";
import { pool } from "../db/pool.js";

export const catalogoRouter = Router();

// Catálogo público de la tienda online. No requiere login.
// GET /api/catalogo?q=&categoria=slug&destacado=true&orden=precio_asc&limit=24&offset=0
catalogoRouter.get("/", async (req, res) => {
  const { q = "", categoria = "", destacado = "", limit = 24, offset = 0 } = req.query;

  const ordenes = {
    nombre_asc: "p.nombre ASC",
    nombre_desc: "p.nombre DESC",
    precio_asc: "p.precio_venta ASC",
    precio_desc: "p.precio_venta DESC"
  };
  const orderBy = ordenes[req.query.orden] || "p.creado_en DESC";

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.nombre, p.marca, p.precio_venta, p.imagen_url, p.destacado,
         c.nombre AS categoria_nombre, c.slug AS categoria_slug,
         COALESCE(SUM(s.cantidad), 0) > 0 AS disponible,
         COUNT(*) OVER() AS total_resultados
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN variantes_producto v ON v.producto_id = p.id AND v.activo = true
       LEFT JOIN stock s ON s.variante_id = v.id
       WHERE p.activo = true
         AND p.nombre ILIKE '%' || $1 || '%'
         AND ($2 = '' OR c.slug = $2)
         AND ($3 = '' OR p.destacado = $3::boolean)
       GROUP BY p.id, c.nombre, c.slug
       ORDER BY ${orderBy}
       LIMIT $4 OFFSET $5`,
      [q, categoria, destacado, limit, offset]
    );
    const total = rows[0]?.total_resultados ? Number(rows[0].total_resultados) : 0;
    res.json({
      productos: rows.map(({ total_resultados, ...p }) => p),
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/catalogo/:id — detalle público de un producto con sus variantes
// (talle/color disponibles y stock agregado de todas las sucursales)
catalogoRouter.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre, c.slug AS categoria_slug
       FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1 AND p.activo = true`,
      [req.params.id]
    );
    const producto = rows[0];
    if (!producto) return res.status(404).json({ error: "Producto no encontrado." });

    const { rows: variantes } = await pool.query(
      `SELECT v.id, v.talle, v.color, COALESCE(SUM(s.cantidad), 0) AS stock
       FROM variantes_producto v
       LEFT JOIN stock s ON s.variante_id = v.id
       WHERE v.producto_id = $1 AND v.activo = true
       GROUP BY v.id
       ORDER BY v.talle, v.color`,
      [req.params.id]
    );

    const { rows: imagenes } = await pool.query(
      "SELECT url, orden FROM imagenes_producto WHERE producto_id = $1 ORDER BY orden",
      [req.params.id]
    );

    res.json({ ...producto, variantes, imagenes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
