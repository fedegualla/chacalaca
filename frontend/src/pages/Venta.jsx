import { useEffect, useState } from "react";
import { apiJson, formatoPrecio } from "../api/client.js";
import Ticket from "../components/Ticket.jsx";
import "./Venta.css";

const FORMAS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta_mp", label: "Tarjeta (Mercado Pago)" },
  { value: "qr_mp", label: "QR (Mercado Pago)" }
];

export default function Venta() {
  const [config, setConfig] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [varianteId, setVarianteId] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [formaPago, setFormaPago] = useState("efectivo");
  const [enviando, setEnviando] = useState(false);
  const [ventaActual, setVentaActual] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState("");
  const [ventaParaImprimir, setVentaParaImprimir] = useState(null);
  const [ventaIdImpresa, setVentaIdImpresa] = useState(null);

  useEffect(() => { apiJson("/configuracion").then(setConfig).catch(() => {}); }, []);

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
    setCarrito((prev) => {
      const existente = prev.find((i) => i.variante_id === variante.id);
      if (existente) {
        return prev.map((i) =>
          i.variante_id === variante.id ? { ...i, cantidad: Math.min(i.cantidad + 1, variante.stock_actual) } : i
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
          stock: variante.stock_actual
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
        .map((i) => (i.variante_id === variante_id ? { ...i, cantidad: Math.max(0, Math.min(i.cantidad + delta, i.stock)) } : i))
        .filter((i) => i.cantidad > 0)
    );
  }

  const subtotal = carrito.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);
  const aplicaDescuento = formaPago === "efectivo" || formaPago === "transferencia";
  const descuentoPct = aplicaDescuento ? Number(config?.descuento_efectivo_transferencia || 0) : 0;
  const total = subtotal * (1 - descuentoPct / 100);

  function nuevaVenta() {
    setVentaActual(null);
    setCarrito([]);
    setClienteNombre("");
    setClienteTelefono("");
    setFormaPago("efectivo");
    setError("");
    setVentaIdImpresa(null);
  }

  async function confirmarVenta() {
    if (carrito.length === 0) return;
    setEnviando(true);
    setError("");
    try {
      const venta = await apiJson("/ventas", {
        method: "POST",
        body: JSON.stringify({
          cliente_nombre: clienteNombre || null,
          cliente_telefono: clienteTelefono || null,
          forma_pago: formaPago,
          items: carrito.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad }))
        })
      });
      setVentaActual(venta);
      setCarrito([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function verificarPago() {
    if (!ventaActual) return;
    setVerificando(true);
    try {
      const actualizada = await apiJson(`/ventas/${ventaActual.id}/verificar-pago`, { method: "POST" });
      setVentaActual((prev) => ({ ...prev, ...actualizada }));
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificando(false);
    }
  }

  function imprimirTicket() {
    setVentaParaImprimir(ventaActual);
  }

  // Apenas el pago queda aprobado (al toque en efectivo/transferencia, o cuando
  // se confirma el cobro de Mercado Pago) se imprime solo, sin que el vendedor
  // tenga que tocar nada. Si el navegador de la PC del local está configurado
  // con --kiosk-printing, esto sale directo a la impresora sin diálogo.
  useEffect(() => {
    if (ventaActual?.estado_pago === "aprobado" && ventaIdImpresa !== ventaActual.id) {
      setVentaParaImprimir(ventaActual);
      setVentaIdImpresa(ventaActual.id);
    }
  }, [ventaActual, ventaIdImpresa]);

  useEffect(() => {
    if (!ventaParaImprimir) return;
    const id = setTimeout(() => window.print(), 50);
    return () => clearTimeout(id);
  }, [ventaParaImprimir]);

  return (
    <div className="venta-layout">
      <div>
        <h2>Vender</h2>
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
              {productoSeleccionado.variantes.map((v) => (
                <option key={v.id} value={v.id} disabled={v.stock_actual <= 0}>
                  {v.talle} / {v.color} — stock: {v.stock_actual}
                </option>
              ))}
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

        {!ventaActual ? (
          <>
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
              <label className="label">Cliente (opcional)</label>
              <input className="input" placeholder="Nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} style={{ marginBottom: 8 }} />
              <input className="input" placeholder="Teléfono" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
            </div>

            <div className="field">
              <label className="label">Forma de pago</label>
              <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                {FORMAS_PAGO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              {aplicaDescuento && descuentoPct > 0 && (
                <div className="venta-descuento-nota">Se aplica {descuentoPct}% de descuento.</div>
              )}
            </div>

            {error && <div className="error-text">{error}</div>}

            <div className="venta-total">
              <span>Total</span>
              <strong>{formatoPrecio(total)}</strong>
            </div>

            <button className="pill-btn pill-btn-primary pill-btn-block" disabled={carrito.length === 0 || enviando} onClick={confirmarVenta}>
              {enviando ? "Confirmando..." : "Confirmar venta"}
            </button>
          </>
        ) : (
          <VentaConfirmada
            venta={ventaActual}
            onVerificar={verificarPago}
            verificando={verificando}
            onImprimir={imprimirTicket}
            onNuevaVenta={nuevaVenta}
          />
        )}
      </div>

      <Ticket venta={ventaParaImprimir} config={config} />
    </div>
  );
}

function VentaConfirmada({ venta, onVerificar, verificando, onImprimir, onNuevaVenta }) {
  const pendiente = venta.estado_pago === "pendiente";
  const aprobado = venta.estado_pago === "aprobado";

  return (
    <div className="venta-confirmada">
      <p className="venta-mensaje-ok">Venta #{venta.id} registrada — Total {formatoPrecio(venta.total)}</p>

      {pendiente && venta.mp_qr_data_url && (
        <div className="venta-qr">
          <p>Pedile al cliente que escanee este QR con la app de Mercado Pago:</p>
          <img src={venta.mp_qr_data_url} alt="QR de pago Mercado Pago" />
        </div>
      )}

      {pendiente && venta.mp_init_point && !venta.mp_qr_data_url && (
        <a className="pill-btn pill-btn-ghost pill-btn-block" href={venta.mp_init_point} target="_blank" rel="noreferrer">
          Abrir cobro con tarjeta en Mercado Pago
        </a>
      )}

      {pendiente && (
        <button className="pill-btn pill-btn-ghost pill-btn-block" onClick={onVerificar} disabled={verificando}>
          {verificando ? "Verificando..." : "Verificar estado del pago"}
        </button>
      )}

      {aprobado && <p className="ok-text">Pago aprobado ✓</p>}
      {venta.estado_pago === "rechazado" && <p className="error-text">El pago fue rechazado.</p>}

      <button className="pill-btn pill-btn-primary pill-btn-block" onClick={onImprimir} disabled={pendiente}>
        Reimprimir ticket
      </button>
      <button className="pill-btn pill-btn-ghost pill-btn-block" onClick={onNuevaVenta}>
        Nueva venta
      </button>
    </div>
  );
}
