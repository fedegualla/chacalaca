import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { requiereAuth } from "../middleware/auth.js";

export const authRouter = Router();

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1 AND activo = true",
      [email]
    );
    const usuario = rows[0];
    if (!usuario || !(await bcrypt.compare(password || "", usuario.password_hash))) {
      return res.status(401).json({ error: "Email o contraseña incorrectos." });
    }
    const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ token, usuario: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/yo — valida el token y devuelve el usuario actual
authRouter.get("/yo", requiereAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});
