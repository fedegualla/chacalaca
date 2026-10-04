import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer({ config = {} }) {
  return (
    <footer className="tienda-footer">
      <div className="container footer-columnas">
        <div className="footer-marca">
          <div className="tienda-logo">CHACALACA</div>
          <p>
            {config.nombre_tienda || "Chacalaca"} — prendas cómodas, con estilo y a precios justos.
          </p>
        </div>

        <div>
          <h4>Tienda</h4>
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Productos</Link>
          <Link to="/mi-cuenta/pedidos">Mis pedidos</Link>
        </div>

        <div>
          <h4>Contacto</h4>
          <p>{config.direccion_local || "Dirección a completar"}</p>
          <p>{config.email_contacto || "contacto@chacalaca.com"}</p>
          {config.whatsapp_numero && (
            <a href={`https://wa.me/${config.whatsapp_numero}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="footer-copy">
        © {new Date().getFullYear()} {config.nombre_tienda || "Chacalaca"} · Todos los derechos reservados
      </div>
    </footer>
  );
}
