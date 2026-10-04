import { Router } from "express";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereAdmin } from "../middleware/auth.js";

export const configuracionRouter = Router();

// GET /api/configuracion — cualquier usuario autenticado la necesita (ticket, descuentos, etc).
configuracionRouter.get("/", requiereAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT clave, valor FROM configuracion");
    const config = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/configuracion — solo admin. body: { [clave]: valor, ... }
configuracionRouter.put("/", requiereAuth, requiereAdmin, async (req, res) => {
  const entradas = Object.entries(req.body || {});
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [clave, valor] of entradas) {
      await client.query(
        `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
         ON CONFLICT (clave) DO UPDATE SET valor = $2`,
        [clave, String(valor)]
      );
    }
    await client.query("COMMIT");
    const { rows } = await pool.query("SELECT clave, valor FROM configuracion");
    res.json(Object.fromEntries(rows.map((r) => [r.clave, r.valor])));
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
