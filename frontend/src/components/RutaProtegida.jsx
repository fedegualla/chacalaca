import { Navigate, Outlet } from "react-router-dom";
import { usuarioActual } from "../api/client.js";

export function RutaProtegida() {
  const usuario = usuarioActual();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RutaAdmin() {
  const usuario = usuarioActual();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}
