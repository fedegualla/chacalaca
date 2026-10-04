import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson, clienteActual, cerrarSesionCliente, formatoPrecio } from "../../api/client.js";
import "./MisPedidos.css";

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const cliente = clienteActual();
  const navigate = useNavigate();

  useEffect(() => {
    apiJson("/pedidos/mios").then(setPedidos).catch(() => setPedidos([]));
  }, []);

  function salir() {
    cerrarSesionCliente();
    navigate("/");
  }

  return (
    <div className="container mis-pedidos">
      <div className="mis-pedidos-header">
        <div>
          <h2>Mi cuenta</h2>
          <p className="venta-sub">{cliente?.nombre} {cliente?.apellido}</p>
        </div>
        <button className="pill-btn pill-btn-outline pill-btn-sm" onClick={salir}>Cerrar sesión</button>
      </div>

      <h3>Mis pedidos</h3>
      {pedidos === null && <p className="spinner-text">Cargando...</p>}
      {pedidos?.length === 0 && <p className="venta-sub">Todavía no hiciste ningún pedido.</p>}

      <div className="mis-pedidos-lista">
        {pedidos?.map((p) => (
          <div key={p.id} className="card mis-pedidos-item">
            <div>
              <div className="mis-pedidos-item-titulo">Pedido #{p.id}</div>
              <div className="venta-sub">{new Date(p.fecha).toLocaleDateString("es-AR")}</div>
            </div>
            <span className="badge badge-soft">{p.estado_pedido}</span>
            <strong>{formatoPrecio(p.total)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
