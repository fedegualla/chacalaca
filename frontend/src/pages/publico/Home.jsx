import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client.js";
import ProductCard from "../../components/ProductCard.jsx";
import "./Home.css";

export default function Home() {
  const [destacados, setDestacados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [descuentoPct, setDescuentoPct] = useState(0);

  useEffect(() => {
    apiJson("/catalogo?destacado=true&limit=8").then((d) => setDestacados(d.productos)).catch(() => {});
    apiJson("/categorias").then(setCategorias).catch(() => {});
    apiJson("/configuracion/publica").then((c) => setDescuentoPct(Number(c.descuento_efectivo_transferencia) || 0)).catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-imagen">
          <div className="hero-texto">
            <span className="hero-kicker">Nueva temporada</span>
            <h1>
              Prendas con carácter
              <br />
              <em>para cada día</em>
            </h1>
            <Link to="/catalogo" className="pill-btn pill-btn-primary">Ver colección</Link>
          </div>
        </div>
        <div className="hero-beneficios">
          <div>
            <strong>Envío gratis</strong>
            <span>A partir de $50.000</span>
          </div>
          <div>
            <strong>20% OFF</strong>
            <span>Pagando en efectivo o transferencia</span>
          </div>
          <div>
            <strong>Cuotas sin interés</strong>
            <span>Con tarjeta vía Mercado Pago</span>
          </div>
        </div>
      </section>

      <section className="container home-seccion">
        <div className="home-seccion-header">
          <h2>Destacados</h2>
          <Link to="/catalogo?destacado=true" className="home-ver-todos">Ver todos →</Link>
        </div>
        <div className="home-grid">
          {destacados.map((p) => <ProductCard key={p.id} producto={p} descuentoPct={descuentoPct} />)}
          {destacados.length === 0 && <p className="venta-sub">Todavía no hay productos destacados.</p>}
        </div>
      </section>

      <section className="container home-seccion home-seccion-categorias">
        <h2>Comprar por categoría</h2>
        <div className="home-categorias">
          {categorias.map((c) => (
            <Link key={c.id} to={`/catalogo?categoria=${c.slug}`} className="home-categoria-item">
              {c.nombre}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
