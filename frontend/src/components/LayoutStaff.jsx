import { NavLink, useNavigate } from "react-router-dom";
import { usuarioStaff, cerrarSesionStaff } from "../api/client.js";
import "./LayoutStaff.css";

const NAV_ITEMS = [
  { to: "/staff/venta", label: "Venta rápida" },
  { to: "/staff/admin", label: "Administración", soloAdmin: true }
];

export default function LayoutStaff({ children }) {
  const usuario = usuarioStaff();
  const navigate = useNavigate();

  function salir() {
    cerrarSesionStaff();
    navigate("/staff/login");
  }

  const items = NAV_ITEMS.filter((item) => !item.soloAdmin || usuario?.rol === "admin");

  return (
    <div className="staff-layout">
      <aside className="staff-sidebar">
        <div className="staff-marca">
          <div className="staff-titulo">Chacalaca</div>
          <div className="staff-sucursal">{usuario?.sucursal_nombre || "Sucursal"}</div>
        </div>

        <nav className="staff-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `staff-nav-link ${isActive ? "activo" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="staff-usuario">
          <div className="staff-usuario-nombre">{usuario?.nombre}</div>
          <button className="staff-salir" onClick={salir}>Salir</button>
        </div>
      </aside>

      <main className="staff-contenido">{children}</main>
    </div>
  );
}
