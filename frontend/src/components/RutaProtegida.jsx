import { Navigate } from "react-router-dom";
import { usuarioStaff } from "../api/client.js";

export default function RutaProtegida({ rolesPermitidos, children }) {
  const usuario = usuarioStaff();
  if (!usuario) return <Navigate to="/staff/login" replace />;
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/staff/venta" replace />;
  }
  return children;
}
