import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiJson, formatoPrecio } from "../../api/client.js";
import { useCart } from "../../context/CartContext.jsx";
import "./ProductoDetalle.css";

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregar } = useCart();
  const [producto, setProducto] = useState(null);
  const [talle, setTalle] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson(`/catalogo/${id}`).then(setProducto).catch(() => setProducto(false));
  }, [id]);

  if (producto === null) return <p className="spinner-text">Cargando...</p>;
  if (producto === false) return <p className="spinner-text">Este producto no existe o ya no está disponible.</p>;

  const talles = [...new Set(producto.variantes.map((v) => v.talle))];
  const colores = [...new Set(producto.variantes.filter((v) => !talle || v.talle === talle).map((v) => v.color))];
  const varianteElegida = producto.variantes.find((v) => v.talle === talle && v.color === color);

  function agregarAlCarrito() {
    if (!varianteElegida) {
      setError("Elegí talle y color.");
      return;
    }
    if (varianteElegida.stock <= 0) {
      setError("Esa combinación no tiene stock.");
      return;
    }
    agregar({
      variante_id: varianteElegida.id,
      producto_nombre: producto.nombre,
      talle: varianteElegida.talle,
      color: varianteElegida.color,
      precio_unitario: Number(producto.precio_venta),
      imagen_url: producto.imagen_url,
      stock: varianteElegida.stock
    });
    setError("");
  }

  return (
    <div className="container detalle">
      <div className="detalle-imagen">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} />
        ) : (
          <span className="detalle-imagen-placeholder">{producto.nombre?.[0]}</span>
        )}
      </div>

      <div className="detalle-info">
        {producto.marca && <div className="product-card-categoria">{producto.marca}</div>}
        <h1>{producto.nombre}</h1>
        {producto.categoria_nombre && <p className="venta-sub">{producto.categoria_nombre}</p>}
        <div className="detalle-precio">{formatoPrecio(producto.precio_venta)}</div>
        {producto.descripcion && <p className="detalle-descripcion">{producto.descripcion}</p>}

        <div className="field">
          <label className="label">Talle</label>
          <div className="detalle-opciones">
            {talles.map((t) => (
              <button
                key={t}
                className={`chip ${talle === t ? "activo" : ""}`}
                onClick={() => { setTalle(t); setColor(""); }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label">Color</label>
          <div className="detalle-opciones">
            {colores.map((c) => (
              <button
                key={c}
                className={`chip ${color === c ? "activo" : ""}`}
                onClick={() => setColor(c)}
                disabled={!talle}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {varianteElegida && (
          <p className="venta-sub">
            {varianteElegida.stock > 0 ? `Stock disponible (${varianteElegida.stock})` : "Sin stock en esta combinación"}
          </p>
        )}
        {error && <div className="error-text">{error}</div>}

        <div className="detalle-acciones">
          <button className="pill-btn pill-btn-primary" onClick={agregarAlCarrito}>Agregar al carrito</button>
          <button className="pill-btn pill-btn-outline" onClick={() => navigate("/catalogo")}>Seguir viendo productos</button>
        </div>
      </div>
    </div>
  );
}
