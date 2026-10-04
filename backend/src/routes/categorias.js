import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereRol } from "../middleware/auth.js";

export const categoriasRouter = Router();
const soloAdmin = [requiereAuth, requiereRol("admin")];

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET /api/categorias — público, para el menú y filtros del catálogo
categoriasRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categorias WHERE activa = true ORDER BY orden, nombre"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categorias/todas — incluye inactivas, solo admin (panel)
categoriasRouter.get("/todas", soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categorias ORDER BY orden, nombre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categorias
// body: { nombre, icono?, orden? }
categoriasRouter.post("/", soloAdmin, async (req, res) => {
  const { nombre, icono, orden = 0 } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO categorias (nombre, slug, icono, orden) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, slugify(nombre), icono || "👕", orden]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ya existe esa categoría." });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categorias/:id
categoriasRouter.put("/:id", soloAdmin, async (req, res) => {
  const { nombre, icono, orden, activa } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categorias SET
         nombre = COALESCE($1, nombre),
         slug = COALESCE($2, slug),
         icono = COALESCE($3, icono),
         orden = COALESCE($4, orden),
         activa = COALESCE($5, activa)
       WHERE id = $6 RETURNING *`,
      [nombre, nombre ? slugify(nombre) : null, icono, orden, activa, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Categoría no encontrada." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categorias/:id — baja lógica (no rompe productos ya categorizados)
categoriasRouter.delete("/:id", soloAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE categorias SET activa = false WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
