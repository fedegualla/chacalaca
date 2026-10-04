import { Navigate } from "react-router-dom";
import { clienteActual } from "../api/client.js";

export default function RutaProtegidaCliente({ children }) {
  const cliente = clienteActual();
  if (!cliente) return <Navigate to="/ingresar" replace />;
  return children;
}
