import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { requiereAuthCliente } from "../middleware/auth.js";

export const authClientesRouter = Router();

function firmarToken(cliente) {
  return jwt.sign(
    { tipo: "cliente", id: cliente.id, nombre: cliente.nombre },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function sinPassword(cliente) {
  const { password_hash, ...resto } = cliente;
  return resto;
}

// POST /api/auth-cliente/registro
// body: { nombre, apellido, email, password, telefono? }
authClientesRouter.post("/registro", async (req, res) => {
  const { nombre, apellido, email, password, telefono } = req.body;
  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO clientes (nombre, apellido, email, password_hash, telefono)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [nombre, apellido, email.toLowerCase().trim(), password_hash, telefono || null]
    );
    const cliente = rows[0];
    res.status(201).json({ token: firmarToken(cliente), cliente: sinPassword(cliente) });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth-cliente/login
// body: { email, password }
authClientesRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query("SELECT * FROM clientes WHERE email = $1", [
      email?.toLowerCase().trim()
    ]);
    const cliente = rows[0];
    if (!cliente) {
      return res.status(401).json({ error: "Email o contraseña incorrectos." });
    }
    const coincide = await bcrypt.compare(password, cliente.password_hash);
    if (!coincide) {
      return res.status(401).json({ error: "Email o contraseña incorrectos." });
    }
    res.json({ token: firmarToken(cliente), cliente: sinPassword(cliente) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth-cliente/perfil
authClientesRouter.get("/perfil", requiereAuthCliente, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clientes WHERE id = $1", [req.cliente.id]);
    if (!rows[0]) return res.status(404).json({ error: "Cliente no encontrado." });
    res.json(sinPassword(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth-cliente/perfil
// body: { nombre?, apellido?, telefono? }
authClientesRouter.put("/perfil", requiereAuthCliente, async (req, res) => {
  const { nombre, apellido, telefono } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET
         nombre = COALESCE($1, nombre),
         apellido = COALESCE($2, apellido),
         telefono = COALESCE($3, telefono)
       WHERE id = $4
       RETURNING *`,
      [nombre, apellido, telefono, req.cliente.id]
    );
    res.json(sinPassword(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
