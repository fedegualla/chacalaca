import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiJson, clienteActual, formatoPrecio } from "../../api/client.js";
import { useCart } from "../../context/CartContext.jsx";
import "./Checkout.css";

const FORMAS_PAGO = [
  { value: "efectivo", label: "Efectivo (retiro en local)" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta_mp", label: "Tarjeta vía Mercado Pago" },
  { value: "qr_mp", label: "QR vía Mercado Pago" }
];

export default function Checkout() {
  const { items, subtotal, vaciar } = useCart();
  const cliente = clienteActual();
  const navigate = useNavigate();
  const [config, setConfig] = useState({});
  const [form, setForm] = useState({
    tipo_entrega: "retiro_local",
    nombre_contacto: cliente ? `${cliente.nombre} ${cliente.apellido}` : "",
    telefono_contacto: cliente?.telefono || "",
    direccion_envio: "",
    ciudad: "",
    provincia: "",
    codigo_postal: "",
    notas: "",
    forma_pago: "efectivo"
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiJson("/configuracion/publica").then(setConfig).catch(() => {});
  }, []);

  const descuentoPct = Number(config.descuento_efectivo_transferencia || 0);
  const aplicaDescuento = form.forma_pago === "efectivo" || form.forma_pago === "transferencia";
  const totalItems = aplicaDescuento ? subtotal * (1 - descuentoPct / 100) : subtotal;
  const costoEnvioFijo = Number(config.costo_envio_fijo || 0);
  const gratisDesde = Number(config.envio_gratis_desde || 0);
  const costoEnvio =
    form.tipo_entrega === "envio_domicilio"
      ? gratisDesde > 0 && subtotal >= gratisDesde ? 0 : costoEnvioFijo
      : 0;
  const total = totalItems + costoEnvio;

  if (items.length === 0) {
    return (
      <div className="container checkout-vacio">
        <p>Tu carrito está vacío.</p>
        <Link to="/catalogo" className="pill-btn pill-btn-primary">Ver productos</Link>
      </div>
    );
  }

  async function confirmar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const pedido = await apiJson("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad }))
        })
      });
      vaciar();
      if (pedido.mp_init_point) {
        window.location.href = pedido.mp_init_point;
      } else {
        navigate(`/pedido/${pedido.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container checkout">
      <form className="checkout-form" onSubmit={confirmar}>
        <h2 className="checkout-titulo">Finalizar compra</h2>

        <div className="field">
          <label className="label">Entrega</label>
          <div className="detalle-opciones">
            <button type="button" className={`chip ${form.tipo_entrega === "retiro_local" ? "activo" : ""}`} onClick={() => setForm({ ...form, tipo_entrega: "retiro_local" })}>Retiro en el local</button>
            <button type="button" className={`chip ${form.tipo_entrega === "envio_domicilio" ? "activo" : ""}`} onClick={() => setForm({ ...form, tipo_entrega: "envio_domicilio" })}>Envío a domicilio</button>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="field">
            <label className="label">Nombre y apellido</label>
            <input className="input" value={form.nombre_contacto} onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label">Teléfono</label>
            <input className="input" value={form.telefono_contacto} onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })} required />
          </div>
        </div>

        {form.tipo_entrega === "envio_domicilio" && (
          <>
            <div className="field">
              <label className="label">Dirección</label>
              <input className="input" value={form.direccion_envio} onChange={(e) => setForm({ ...form, direccion_envio: e.target.value })} required />
            </div>
            <div className="checkout-grid">
              <div className="field">
                <label className="label">Ciudad</label>
                <input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required />
              </div>
              <div className="field">
                <label className="label">Provincia</label>
                <input className="input" value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Código postal</label>
                <input className="input" value={form.codigo_postal} onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })} />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label className="label">Notas (opcional)</label>
          <textarea className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>

        <div className="field">
          <label className="label">Forma de pago</label>
          <div className="checkout-formas-pago">
            {FORMAS_PAGO.map((f) => (
              <button
                type="button"
                key={f.value}
                className={`chip ${form.forma_pago === f.value ? "activo" : ""}`}
                onClick={() => setForm({ ...form, forma_pago: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
          {aplicaDescuento && descuentoPct > 0 && (
            <p className="venta-descuento-nota">{descuentoPct}% de descuento aplicado por pagar en {form.forma_pago}.</p>
          )}
        </div>

        {error && <div className="error-text">{error}</div>}

        <button className="pill-btn pill-btn-primary pill-btn-block" disabled={enviando}>
          {enviando ? "Procesando..." : `Confirmar pedido — ${formatoPrecio(total)}`}
        </button>
      </form>

      <div className="card checkout-resumen">
        <h3>Resumen</h3>
        {items.map((i) => (
          <div key={i.variante_id} className="checkout-resumen-item">
            <span>{i.cantidad}x {i.producto_nombre} ({i.talle}/{i.color})</span>
            <span>{formatoPrecio(i.precio_unitario * i.cantidad)}</span>
          </div>
        ))}
        <div className="checkout-resumen-linea">
          <span>Subtotal</span>
          <span>{formatoPrecio(subtotal)}</span>
        </div>
        {aplicaDescuento && descuentoPct > 0 && (
          <div className="checkout-resumen-linea checkout-descuento">
            <span>Descuento ({descuentoPct}%)</span>
            <span>−{formatoPrecio(subtotal - totalItems)}</span>
          </div>
        )}
        <div className="checkout-resumen-linea">
          <span>Envío</span>
          <span>{costoEnvio > 0 ? formatoPrecio(costoEnvio) : "Gratis"}</span>
        </div>
        <div className="checkout-resumen-total">
          <span>Total</span>
          <strong>{formatoPrecio(total)}</strong>
        </div>
      </div>
    </div>
  );
}
