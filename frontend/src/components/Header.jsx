import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { clienteActual } from "../api/client.js";
import "./Header.css";

function IconoCarrito(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 4h2l1.4 12.4A2 2 0 0 0 9.4 18.2h8.2a2 2 0 0 0 2-1.7L21 8H6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="21" r="1.3" fill="currentColor" />
      <circle cx="17" cy="21" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconoUsuario(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c1.3-3.6 4-5.5 7-5.5s5.7 1.9 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { cantidadTotal, setAbierto } = useCart();
  const cliente = clienteActual();
  const navigate = useNavigate();

  return (
    <header className="tienda-header">
      <div className="tienda-header-top container">
        <Link to="/" className="tienda-logo">CHACALACA</Link>
        <div className="tienda-header-acciones">
          {cliente ? (
            <button className="tienda-icon-btn" onClick={() => navigate("/mi-cuenta/pedidos")}>
              <IconoUsuario width={19} height={19} />
              <span>{cliente.nombre}</span>
            </button>
          ) : (
            <button className="tienda-icon-btn" onClick={() => navigate("/ingresar")}>
              <IconoUsuario width={19} height={19} />
              <span>Ingresar</span>
            </button>
          )}
          <button className="tienda-icon-btn" onClick={() => setAbierto(true)}>
            <IconoCarrito width={19} height={19} />
            <span>Carrito ({cantidadTotal})</span>
          </button>
        </div>
      </div>

      <nav className="tienda-nav">
        <div className="container tienda-nav-inner">
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Todos los productos</Link>
          <Link to="/catalogo?destacado=true">Destacados</Link>
        </div>
      </nav>
    </header>
  );
}
