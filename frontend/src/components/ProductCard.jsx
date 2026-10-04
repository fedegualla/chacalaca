import { Link } from "react-router-dom";
import { formatoPrecio } from "../api/client.js";
import "./ProductCard.css";

export default function ProductCard({ producto, descuentoPct = 0 }) {
  const precioTransferencia = descuentoPct > 0
    ? Number(producto.precio_venta) * (1 - descuentoPct / 100)
    : null;

  return (
    <Link to={`/producto/${producto.id}`} className="product-card">
      <div className="product-card-img">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} />
        ) : (
          <span className="product-card-img-placeholder">{producto.nombre?.[0] || "C"}</span>
        )}
        {!producto.disponible && <span className="product-card-tag product-card-tag-agotado">Sin stock</span>}
      </div>
      <div className="product-card-body">
        {producto.categoria_nombre && (
          <div className="product-card-categoria">{producto.categoria_nombre}</div>
        )}
        <div className="product-card-nombre">{producto.nombre}</div>
        <div className="product-card-precio">{formatoPrecio(producto.precio_venta)}</div>
        {precioTransferencia && (
          <div className="product-card-transferencia">
            {formatoPrecio(precioTransferencia)} con transferencia
          </div>
        )}
      </div>
    </Link>
  );
}
