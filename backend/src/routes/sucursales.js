import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereRol } from "../middleware/auth.js";

export const sucursalesRouter = Router();

// GET /api/sucursales — el router padre ya exige requiereAuth (staff)
sucursalesRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM sucursales ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

sucursalesRouter.post("/", requiereRol("admin"), async (req, res) => {
  const { nombre, direccion, telefono } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO sucursales (nombre, direccion, telefono) VALUES ($1,$2,$3) RETURNING *",
      [nombre, direccion || null, telefono || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

sucursalesRouter.put("/:id", requiereRol("admin"), async (req, res) => {
  const { nombre, direccion, telefono, activa } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE sucursales SET
         nombre = COALESCE($1, nombre),
         direccion = COALESCE($2, direccion),
         telefono = COALESCE($3, telefono),
         activa = COALESCE($4, activa)
       WHERE id = $5 RETURNING *`,
      [nombre, direccion, telefono, activa, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Sucursal no encontrada." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
