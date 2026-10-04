import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereRol } from "../middleware/auth.js";

export const configuracionRouter = Router();
const soloAdmin = [requiereAuth, requiereRol("admin")];

// Toda la configuración de esta tienda es información no sensible (nombre,
// WhatsApp, costos de envío, etc.), así que se expone completa sin login:
// la usan tanto el catálogo público como el checkout.
// GET /api/configuracion/publica
configuracionRouter.get("/publica", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT clave, valor FROM configuracion");
    res.json(Object.fromEntries(rows.map((r) => [r.clave, r.valor])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/configuracion — listado completo, solo admin
configuracionRouter.get("/", soloAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM configuracion ORDER BY clave");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crea o actualiza un valor de configuración.
// PUT /api/configuracion/:clave
// body: { valor }
configuracionRouter.put("/:clave", soloAdmin, async (req, res) => {
  const { clave } = req.params;
  const { valor } = req.body;
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    return res.status(400).json({ error: "El valor no puede estar vacío." });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
       RETURNING *`,
      [clave, String(valor).trim()]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
