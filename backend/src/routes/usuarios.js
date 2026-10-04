import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { requiereAuth, requiereAdmin } from "../middleware/auth.js";

export const usuariosRouter = Router();

// GET /api/usuarios — solo admin
usuariosRouter.get("/", requiereAuth, requiereAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios — crea un vendedor o admin nuevo
usuariosRouter.post("/", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, email, password, rol = "vendedor" } = req.body;
  if (!nombre?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: "Nombre, email y una contraseña de al menos 6 caracteres son obligatorios." });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,$4) RETURNING id, nombre, email, rol, activo, creado_en`,
      [nombre.trim(), email.trim().toLowerCase(), password_hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ya existe un usuario con ese email." });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id — editar nombre/rol/activo, y opcionalmente la contraseña
usuariosRouter.put("/:id", requiereAuth, requiereAdmin, async (req, res) => {
  const { nombre, rol, activo, password } = req.body;
  try {
    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await pool.query(
      `UPDATE usuarios SET
        nombre = COALESCE($1, nombre), rol = COALESCE($2, rol), activo = COALESCE($3, activo),
        password_hash = COALESCE($4, password_hash)
       WHERE id = $5 RETURNING id, nombre, email, rol, activo, creado_en`,
      [nombre, rol, activo, password_hash, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
