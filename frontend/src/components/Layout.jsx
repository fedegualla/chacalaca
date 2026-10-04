import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cerrarSesion, usuarioActual } from "../api/client.js";
import "./Layout.css";

export default function Layout() {
  const usuario = usuarioActual();
  const navigate = useNavigate();

  function salir() {
    cerrarSesion();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-marca">Chacalaca</div>
        <nav className="layout-nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/venta">Vender</NavLink>
          <NavLink to="/ventas">Historial de ventas</NavLink>
          <NavLink to="/productos">Productos y stock</NavLink>
          <NavLink to="/categorias">Categorías</NavLink>
          {usuario?.rol === "admin" && <NavLink to="/usuarios">Usuarios</NavLink>}
          {usuario?.rol === "admin" && <NavLink to="/configuracion">Configuración</NavLink>}
        </nav>
      </aside>
      <div className="layout-main">
        <header className="layout-topbar">
          <span>{usuario?.nombre} · <span className="layout-rol">{usuario?.rol}</span></span>
          <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={salir}>Salir</button>
        </header>
        <main className="layout-contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
