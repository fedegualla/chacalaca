import jwt from "jsonwebtoken";

// Verifica que venga un token válido de STAFF (admin/vendedor) en el header
// Authorization: Bearer <token>
export function requiereAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }
  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.tipo !== "staff") throw new Error("tipo incorrecto");
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o vencido." });
  }
}

// Restringe una ruta solo a ciertos roles de staff, ej: requiereRol("admin")
export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: "No tenés permiso para esta acción." });
    }
    next();
  };
}

// Verifica que venga un token válido de CLIENTE (cuenta de la tienda online)
export function requiereAuthCliente(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado." });
  }
  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.tipo !== "cliente") throw new Error("tipo incorrecto");
    req.cliente = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o vencido." });
  }
}

// Deja pasar tanto a un cliente logueado como a un invitado (checkout sin cuenta).
// Si viene token de cliente válido, completa req.cliente; si no, sigue sin él.
export function authClienteOpcional(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const token = header.split(" ")[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.tipo === "cliente") req.cliente = payload;
    } catch {
      // token inválido: seguimos como invitado
    }
  }
  next();
}
