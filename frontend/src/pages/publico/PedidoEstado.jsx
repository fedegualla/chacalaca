import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiJson, formatoPrecio } from "../../api/client.js";
import "./PedidoEstado.css";

const MENSAJES_PAGO = {
  aprobado: { texto: "Pago confirmado" },
  pendiente: { texto: "Esperando la confirmación del pago" },
  rechazado: { texto: "El pago no se pudo confirmar" }
};

export default function PedidoEstado() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    function cargar() {
      apiJson(`/pedidos/${id}`).then(setPedido).catch(() => setPedido(false));
    }
    cargar();
    const intervalo = setInterval(cargar, 5000);
    return () => clearInterval(intervalo);
  }, [id]);

  if (pedido === null) return <p className="spinner-text">Cargando...</p>;
  if (pedido === false) return <p className="spinner-text">No encontramos ese pedido.</p>;

  const msg = MENSAJES_PAGO[pedido.estado_pago] || MENSAJES_PAGO.pendiente;

  return (
    <div className="container pedido-estado">
      <div className="card pedido-estado-card">
        <h2>{msg.texto}</h2>
        <p className="venta-sub">Pedido #{pedido.id}</p>

        <div className="pedido-estado-items">
          {pedido.items.map((i) => (
            <div key={i.id} className="checkout-resumen-item">
              <span>{i.cantidad}x {i.producto_nombre} ({i.talle}/{i.color})</span>
              <span>{formatoPrecio(i.precio_unitario * i.cantidad)}</span>
            </div>
          ))}
        </div>

        <div className="checkout-resumen-total">
          <span>Total</span>
          <strong>{formatoPrecio(pedido.total)}</strong>
        </div>

        <p className="venta-sub" style={{ marginTop: 12 }}>
          Estado del pedido: <strong>{pedido.estado_pedido}</strong>
        </p>

        <Link to="/catalogo" className="pill-btn pill-btn-primary" style={{ marginTop: 20 }}>Seguir comprando</Link>
      </div>
    </div>
  );
}
