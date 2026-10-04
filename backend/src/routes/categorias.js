import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereAdmin } from "../middleware/auth.js";

export const categoriasRouter = Router();

// GET /api/categorias
categoriasRouter.get("/", requiereAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categorias ORDER BY orden, nombre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categorias
categoriasRouter.post("/", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, orden = 0 } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
  try {
    const { rows } = await pool.query(
      "INSERT INTO categorias (nombre, orden) VALUES ($1, $2) RETURNING *",
      [nombre.trim(), orden]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categorias/:id
categoriasRouter.put("/:id", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, orden, activa } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE categorias SET nombre = COALESCE($1, nombre), orden = COALESCE($2, orden),
        activa = COALESCE($3, activa) WHERE id = $4 RETURNING *`,
      [nombre, orden, activa, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Categoría no encontrada." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categorias/:id
categoriasRouter.delete("/:id", requiereAuth, requiereAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM categorias WHERE id = $1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: "No se puede borrar: tiene productos asociados." });
  }
});
