import { formatoPrecio, formatoFecha } from "../api/client.js";
import "./Ticket.css";

const FORMAS_PAGO_LABEL = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_mp: "Tarjeta (Mercado Pago)",
  qr_mp: "QR (Mercado Pago)"
};

// Ticket oculto en pantalla, que solo se vuelve visible al imprimir (ver
// Ticket.css). Se imprime llamando a window.print() con este componente ya
// montado y la venta cargada — ver imprimirVenta() en Venta.jsx.
export default function Ticket({ venta, config }) {
  if (!venta) return null;
  const anchoMm = config?.ancho_ticket === "58" ? "58mm" : "80mm";

  return (
    <div className="ticket-imprimible" style={{ "--ticket-ancho": anchoMm }}>
      <div className="ticket-header">
        <h3>{config?.nombre_tienda || "Chacalaca"}</h3>
        {config?.direccion_local && <p>{config.direccion_local}</p>}
        {config?.telefono_local && <p>Tel: {config.telefono_local}</p>}
        {config?.cuit && <p>CUIT: {config.cuit}</p>}
      </div>
      <hr className="ticket-sep" />
      <p>Ticket #{venta.id} — {formatoFecha(venta.fecha)}</p>
      {venta.cliente_nombre && <p>Cliente: {venta.cliente_nombre}</p>}
      <hr className="ticket-sep" />
      {venta.items.map((item, i) => (
        <div className="ticket-item" key={i}>
          <div className="ticket-fila">
            <span>{item.cantidad} x {item.producto_nombre}</span>
            <span>{formatoPrecio(item.precio_unitario * item.cantidad)}</span>
          </div>
          <div className="ticket-item-detalle">{item.talle} / {item.color}</div>
        </div>
      ))}
      <hr className="ticket-sep" />
      {Number(venta.descuento_porcentaje) > 0 && (
        <div className="ticket-fila">
          <span>Subtotal</span>
          <span>{formatoPrecio(venta.subtotal)}</span>
        </div>
      )}
      {Number(venta.descuento_porcentaje) > 0 && (
        <div className="ticket-fila">
          <span>Descuento ({venta.descuento_porcentaje}%)</span>
          <span>-{formatoPrecio(venta.subtotal - venta.total)}</span>
        </div>
      )}
      <div className="ticket-fila ticket-total">
        <span>TOTAL</span>
        <span>{formatoPrecio(venta.total)}</span>
      </div>
      <p>Forma de pago: {FORMAS_PAGO_LABEL[venta.forma_pago] || venta.forma_pago}</p>
      <div className="ticket-footer">
        <p>{config?.mensaje_pie_ticket || "¡Gracias por tu compra!"}</p>
      </div>
    </div>
  );
}
