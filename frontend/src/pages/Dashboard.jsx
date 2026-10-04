import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, formatoPrecio } from "../api/client.js";
import "./Dashboard.css";

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson("/reportes/resumen").then(setResumen).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-text">{error}</div>;
  if (!resumen) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="dash-grid">
        <div className="card dash-tile">
          <span className="dash-tile-label">Ventas de hoy</span>
          <strong className="dash-tile-valor">{resumen.ventas_hoy.cantidad}</strong>
          <span className="dash-tile-sub">{formatoPrecio(resumen.ventas_hoy.total)}</span>
        </div>
        <div className="card dash-tile">
          <span className="dash-tile-label">Pagos pendientes de MP</span>
          <strong className="dash-tile-valor">{resumen.pagos_pendientes}</strong>
          <Link to="/ventas?estado_pago=pendiente" className="dash-tile-link">Ver ventas</Link>
        </div>
        <div className="card dash-tile">
          <span className="dash-tile-label">Variantes con stock bajo</span>
          <strong className="dash-tile-valor">{resumen.variantes_stock_bajo}</strong>
          <Link to="/productos?stockBajo=1" className="dash-tile-link">Ver productos</Link>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card">
          <h3>Ventas de hoy por forma de pago</h3>
          {resumen.por_forma_pago_hoy.length === 0 ? (
            <p className="dash-vacio">Todavía no hay ventas hoy.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Forma de pago</th><th>Cantidad</th><th>Total</th></tr></thead>
              <tbody>
                {resumen.por_forma_pago_hoy.map((r) => (
                  <tr key={r.forma_pago}>
                    <td>{r.forma_pago}</td>
                    <td>{r.cantidad}</td>
                    <td>{formatoPrecio(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Más vendidos (últimos 30 días)</h3>
          {resumen.mas_vendidos_30d.length === 0 ? (
            <p className="dash-vacio">Todavía no hay ventas.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Producto</th><th>Variante</th><th>Cantidad</th></tr></thead>
              <tbody>
                {resumen.mas_vendidos_30d.map((r, i) => (
                  <tr key={i}>
                    <td>{r.producto_nombre}</td>
                    <td>{r.talle} / {r.color}</td>
                    <td>{r.cantidad_vendida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
