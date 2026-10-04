import { useEffect, useState } from "react";
import { apiJson, formatoPrecio, usuarioStaff } from "../../api/client.js";
import "./PantallaVenta.css";

const FORMAS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta_mp", label: "Tarjeta (Mercado Pago)" },
  { value: "qr_mp", label: "QR (Mercado Pago)" }
];

export default function PantallaVenta() {
  const usuario = usuarioStaff();
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [varianteId, setVarianteId] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [formaPago, setFormaPago] = useState("efectivo");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      if (!busqueda.trim()) return setResultados([]);
      apiJson(`/productos?q=${encodeURIComponent(busqueda)}`).then(setResultados).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function abrirProducto(p) {
    const detalle = await apiJson(`/productos/${p.id}`);
    setProductoSeleccionado(detalle);
    setVarianteId("");
  }

  function agregarAlCarrito() {
    if (!varianteId) return;
    const variante = productoSeleccionado.variantes.find((v) => String(v.id) === varianteId);
    const stockSucursal = variante.stock.find((s) => s.sucursal_id === usuario.sucursal_id)?.cantidad || 0;
    setCarrito((prev) => {
      const existente = prev.find((i) => i.variante_id === variante.id);
      if (existente) {
        return prev.map((i) =>
          i.variante_id === variante.id ? { ...i, cantidad: Math.min(i.cantidad + 1, stockSucursal) } : i
        );
      }
      return [
        ...prev,
        {
          variante_id: variante.id,
          producto_nombre: productoSeleccionado.nombre,
          talle: variante.talle,
          color: variante.color,
          precio_unitario: Number(productoSeleccionado.precio_venta),
          cantidad: 1,
          stock: stockSucursal
        }
      ];
    });
    setProductoSeleccionado(null);
    setBusqueda("");
    setResultados([]);
  }

  function cambiarCantidad(variante_id, delta) {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.variante_id === variante_id
            ? { ...i, cantidad: Math.max(0, Math.min(i.cantidad + delta, i.stock)) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  }

  const subtotal = carrito.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);
  const aplicaDescuento = formaPago === "efectivo" || formaPago === "transferencia";

  async function confirmarVenta() {
    if (carrito.length === 0) return;
    setEnviando(true);
    setError("");
    try {
      const pedido = await apiJson("/pedidos/local", {
        method: "POST",
        body: JSON.stringify({
          forma_pago: formaPago,
          items: carrito.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad }))
        })
      });
      if (pedido.mp_init_point) {
        window.open(pedido.mp_init_point, "_blank");
      }
      setMensaje(`Venta #${pedido.id} registrada — Total ${formatoPrecio(pedido.total)}`);
      setCarrito([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="venta-layout">
      <div>
        <h2>Venta rápida</h2>
        <p className="venta-sub">Buscá un producto para agregarlo al ticket.</p>

        <input
          className="input"
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {resultados.length > 0 && (
          <div className="venta-resultados card">
            {resultados.map((p) => (
              <button key={p.id} className="venta-resultado-item" onClick={() => abrirProducto(p)}>
                <span>{p.nombre}</span>
                <span className="venta-resultado-precio">{formatoPrecio(p.precio_venta)}</span>
              </button>
            ))}
          </div>
        )}

        {productoSeleccionado && (
          <div className="card venta-selector">
            <h4>{productoSeleccionado.nombre}</h4>
            <select className="input" value={varianteId} onChange={(e) => setVarianteId(e.target.value)}>
              <option value="">Elegí talle / color...</option>
              {productoSeleccionado.variantes.map((v) => {
                const stockSucursal = v.stock.find((s) => s.sucursal_id === usuario.sucursal_id)?.cantidad || 0;
                return (
                  <option key={v.id} value={v.id} disabled={stockSucursal <= 0}>
                    {v.talle} / {v.color} — stock: {stockSucursal}
                  </option>
                );
              })}
            </select>
            <div className="venta-selector-acciones">
              <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => setProductoSeleccionado(null)}>Cancelar</button>
              <button className="pill-btn pill-btn-primary pill-btn-sm" disabled={!varianteId} onClick={agregarAlCarrito}>Agregar</button>
            </div>
          </div>
        )}
      </div>

      <div className="card venta-ticket">
        <h3>Ticket</h3>
        {carrito.length === 0 ? (
          <p className="venta-sub">Sin ítems todavía.</p>
        ) : (
          <div className="venta-ticket-items">
            {carrito.map((i) => (
              <div key={i.variante_id} className="venta-ticket-item">
                <div>
                  <div className="venta-ticket-nombre">{i.producto_nombre}</div>
                  <div className="venta-sub">{i.talle} / {i.color}</div>
                </div>
                <div className="venta-ticket-cantidad">
                  <button onClick={() => cambiarCantidad(i.variante_id, -1)}>−</button>
                  <span>{i.cantidad}</span>
                  <button onClick={() => cambiarCantidad(i.variante_id, 1)}>+</button>
                </div>
                <div className="venta-ticket-precio">{formatoPrecio(i.precio_unitario * i.cantidad)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label className="label">Forma de pago</label>
          <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
            {FORMAS_PAGO.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {aplicaDescuento && <div className="venta-descuento-nota">Se aplica el descuento por efectivo/transferencia configurado.</div>}
        </div>

        {error && <div className="error-text">{error}</div>}
        {mensaje && <div className="venta-mensaje-ok">{mensaje}</div>}

        <div className="venta-total">
          <span>Total</span>
          <strong>{formatoPrecio(subtotal)}</strong>
        </div>

        <button className="pill-btn pill-btn-primary pill-btn-block" disabled={carrito.length === 0 || enviando} onClick={confirmarVenta}>
          {enviando ? "Confirmando..." : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}
