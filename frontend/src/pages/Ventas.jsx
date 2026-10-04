import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson, formatoPrecio, formatoFecha, usuarioActual } from "../api/client.js";
import Ticket from "../components/Ticket.jsx";
import "./Ventas.css";

const ESTADO_PAGO_BADGE = { pendiente: "badge-warning", aprobado: "badge-success", rechazado: "badge-danger" };

export default function Ventas() {
  const esAdmin = usuarioActual()?.rol === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const [ventas, setVentas] = useState([]);
  const [estadoPago, setEstadoPago] = useState(searchParams.get("estado_pago") || "");
  const [formaPago, setFormaPago] = useState("");
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [ventaParaImprimir, setVentaParaImprimir] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => { apiJson("/configuracion").then(setConfig).catch(() => {}); }, []);

  function recargar() {
    const qs = new URLSearchParams({ estado_pago: estadoPago, forma_pago: formaPago });
    apiJson(`/ventas?${qs.toString()}`).then(setVentas).catch((e) => setError(e.message));
  }

  useEffect(() => {
    recargar();
    setSearchParams(estadoPago ? { estado_pago: estadoPago } : {});
  }, [estadoPago, formaPago]);

  async function abrirDetalle(id) {
    const venta = await apiJson(`/ventas/${id}`);
    setDetalle(venta);
  }

  async function cancelarVenta(id) {
    if (!confirm("¿Cancelar esta venta? El stock vendido vuelve a estar disponible.")) return;
    try {
      await apiJson(`/ventas/${id}/cancelar`, { method: "PUT" });
      recargar();
      setDetalle(null);
    } catch (err) {
      alert(err.message);
    }
  }

  function imprimir(venta) {
    setVentaParaImprimir(venta);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div>
      <h2>Historial de ventas</h2>

      <div className="toolbar">
        <select className="input" style={{ maxWidth: 200 }} value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)}>
          <option value="">Todos los estados de pago</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
          <option value="">Todas las formas de pago</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta_mp">Tarjeta (Mercado Pago)</option>
          <option value="qr_mp">QR (Mercado Pago)</option>
        </select>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <table className="table">
          <thead><tr><th>#</th><th>Fecha</th><th>Vendedor</th><th>Forma de pago</th><th>Total</th><th>Estado pago</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{formatoFecha(v.fecha)}</td>
                <td>{v.vendedor_nombre || "—"}</td>
                <td>{v.forma_pago}</td>
                <td>{formatoPrecio(v.total)}</td>
                <td><span className={`badge ${ESTADO_PAGO_BADGE[v.estado_pago]}`}>{v.estado_pago}</span></td>
                <td><span className={`badge ${v.estado_venta === "completada" ? "badge-success" : "badge-muted"}`}>{v.estado_venta}</span></td>
                <td><button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => abrirDetalle(v.id)}>Ver</button></td>
              </tr>
            ))}
            {ventas.length === 0 && <tr><td colSpan={8} className="productos-vacio">No hay ventas con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div className="venta-detalle-overlay" onClick={() => setDetalle(null)}>
          <div className="card venta-detalle" onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h3 style={{ marginRight: "auto" }}>Venta #{detalle.id}</h3>
              <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
            <p className="venta-sub">{formatoFecha(detalle.fecha)} — Vendedor: {detalle.vendedor_nombre || "—"}</p>
            <table className="table">
              <thead><tr><th>Producto</th><th>Talle/Color</th><th>Cant.</th><th>Precio</th></tr></thead>
              <tbody>
                {detalle.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.producto_nombre}</td>
                    <td>{i.talle} / {i.color}</td>
                    <td>{i.cantidad}</td>
                    <td>{formatoPrecio(i.precio_unitario * i.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="venta-total"><span>Total</span><strong>{formatoPrecio(detalle.total)}</strong></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pill-btn pill-btn-primary" onClick={() => imprimir(detalle)}>Reimprimir ticket</button>
              {esAdmin && detalle.estado_venta !== "cancelada" && (
                <button className="pill-btn pill-btn-danger" onClick={() => cancelarVenta(detalle.id)}>Cancelar venta</button>
              )}
            </div>
          </div>
        </div>
      )}

      <Ticket venta={ventaParaImprimir} config={config} />
    </div>
  );
}
