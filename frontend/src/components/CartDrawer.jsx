import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatoPrecio } from "../api/client.js";
import "./CartDrawer.css";

export default function CartDrawer() {
  const { items, abierto, setAbierto, quitar, actualizarCantidad, subtotal } = useCart();
  const navigate = useNavigate();

  if (!abierto) return null;

  return (
    <div className="cart-overlay" onClick={() => setAbierto(false)}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <h3>Tu carrito</h3>
          <button className="cart-close" onClick={() => setAbierto(false)}>✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-vacio">
            <p>Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.variante_id}>
                  <div className="cart-item-img">
                    {item.imagen_url ? <img src={item.imagen_url} alt="" /> : item.producto_nombre?.[0]}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-nombre">{item.producto_nombre}</div>
                    <div className="cart-item-variante">Talle: {item.talle} · Color: {item.color}</div>
                    <div className="cart-item-precio">{formatoPrecio(item.precio_unitario)}</div>
                    <div className="cart-item-cantidad">
                      <button onClick={() => actualizarCantidad(item.variante_id, item.cantidad - 1)}>−</button>
                      <span>{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.variante_id, item.cantidad + 1)}>+</button>
                      <button className="cart-item-quitar" onClick={() => quitar(item.variante_id)}>Quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <strong>{formatoPrecio(subtotal)}</strong>
              </div>
              <button
                className="pill-btn pill-btn-primary pill-btn-block"
                onClick={() => {
                  setAbierto(false);
                  navigate("/checkout");
                }}
              >
                Ir a pagar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
