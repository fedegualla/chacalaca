import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiJson, formatoPrecio, formatoFecha, usuarioActual } from "../api/client.js";
import "./Productos.css";

const TIPOS_MOVIMIENTO = [
  { value: "ingreso", label: "Ingreso de mercadería" },
  { value: "ajuste", label: "Ajuste manual" },
  { value: "devolucion", label: "Devolución" }
];

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esAdmin = usuarioActual()?.rol === "admin";
  const [producto, setProducto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nuevaVariante, setNuevaVariante] = useState({ talle: "", color: "", stock_actual: "", stock_minimo: "2" });
  const [movHistorial, setMovHistorial] = useState(null);

  function recargar() {
    apiJson(`/productos/${id}`).then(setProducto).catch((e) => setError(e.message));
  }

  useEffect(() => {
    recargar();
    apiJson("/categorias").then(setCategorias).catch(() => {});
  }, [id]);

  async function guardarProducto(e) {
    e.preventDefault();
    setError(""); setMensaje("");
    try {
      await apiJson(`/productos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: producto.nombre, descripcion: producto.descripcion,
          categoria_id: producto.categoria_id || null, marca: producto.marca,
          precio_costo: producto.precio_costo, precio_venta: producto.precio_venta
        })
      });
      setMensaje("Producto actualizado.");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function alternarActivo() {
    try {
      await apiJson(`/productos/${id}`, { method: "PUT", body: JSON.stringify({ activo: !producto.activo }) });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function agregarVariante() {
    if (!nuevaVariante.talle.trim() || !nuevaVariante.color.trim()) return;
    setError("");
    try {
      await apiJson(`/productos/${id}/variantes`, { method: "POST", body: JSON.stringify(nuevaVariante) });
      setNuevaVariante({ talle: "", color: "", stock_actual: "", stock_minimo: "2" });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function registrarMovimiento(varianteId, tipo, cantidad, motivo) {
    const cant = Number(cantidad);
    if (!cant) return;
    // Ingreso/devolución siempre suman; en ajuste el signo lo decide quien carga la corrección.
    const cantidadFinal = tipo === "ajuste" ? cant : Math.abs(cant);
    try {
      await apiJson(`/productos/variantes/${varianteId}/movimiento`, {
        method: "POST",
        body: JSON.stringify({ tipo, cantidad: cantidadFinal, motivo })
      });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verMovimientos(varianteId) {
    const rows = await apiJson(`/productos/variantes/${varianteId}/movimientos`);
    setMovHistorial({ varianteId, rows });
  }

  if (error && !producto) return <div className="error-text">{error}</div>;
  if (!producto) return <p>Cargando...</p>;

  return (
    <div>
      <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => navigate("/productos")}>← Volver</button>
      <h2>{producto.nombre}</h2>

      <form className="card producto-form" onSubmit={guardarProducto}>
        <div className="field"><label className="label">Nombre</label>
          <input className="input" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} disabled={!esAdmin} />
        </div>
        <div className="producto-form-grid">
          <div className="field"><label className="label">Categoría</label>
            <select className="input" value={producto.categoria_id || ""} onChange={(e) => setProducto({ ...producto, categoria_id: e.target.value })} disabled={!esAdmin}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Marca</label>
            <input className="input" value={producto.marca || ""} onChange={(e) => setProducto({ ...producto, marca: e.target.value })} disabled={!esAdmin} />
          </div>
          <div className="field"><label className="label">Precio de costo</label>
            <input className="input" type="number" min="0" step="0.01" value={producto.precio_costo} onChange={(e) => setProducto({ ...producto, precio_costo: e.target.value })} disabled={!esAdmin} />
          </div>
          <div className="field"><label className="label">Precio de venta</label>
            <input className="input" type="number" min="0" step="0.01" value={producto.precio_venta} onChange={(e) => setProducto({ ...producto, precio_venta: e.target.value })} disabled={!esAdmin} />
          </div>
        </div>
        <div className="field"><label className="label">Descripción</label>
          <textarea className="input" rows={2} value={producto.descripcion || ""} onChange={(e) => setProducto({ ...producto, descripcion: e.target.value })} disabled={!esAdmin} />
        </div>
        {error && <div className="error-text">{error}</div>}
        {mensaje && <div className="ok-text">{mensaje}</div>}
        {esAdmin && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="pill-btn pill-btn-primary">Guardar cambios</button>
            <button type="button" className="pill-btn pill-btn-ghost" onClick={alternarActivo}>
              {producto.activo ? "Desactivar producto" : "Activar producto"}
            </button>
          </div>
        )}
      </form>

      <h3 style={{ marginTop: 24 }}>Talles, colores y stock</h3>
      <div className="card">
        <table className="table">
          <thead><tr><th>Talle</th><th>Color</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th>{esAdmin && <th>Movimiento</th>}</tr></thead>
          <tbody>
            {producto.variantes.map((v) => (
              <VarianteFila key={v.id} variante={v} esAdmin={esAdmin} onMovimiento={registrarMovimiento} onVerHistorial={verMovimientos} />
            ))}
          </tbody>
        </table>

        {esAdmin && (
          <div className="variante-nueva-form">
            <div className="field"><label className="label">Talle</label>
              <input className="input" value={nuevaVariante.talle} onChange={(e) => setNuevaVariante((v) => ({ ...v, talle: e.target.value }))} />
            </div>
            <div className="field"><label className="label">Color</label>
              <input className="input" value={nuevaVariante.color} onChange={(e) => setNuevaVariante((v) => ({ ...v, color: e.target.value }))} />
            </div>
            <div className="field"><label className="label">Stock inicial</label>
              <input className="input" type="number" min="0" value={nuevaVariante.stock_actual} onChange={(e) => setNuevaVariante((v) => ({ ...v, stock_actual: e.target.value }))} />
            </div>
            <div className="field"><label className="label">Stock mínimo</label>
              <input className="input" type="number" min="0" value={nuevaVariante.stock_minimo} onChange={(e) => setNuevaVariante((v) => ({ ...v, stock_minimo: e.target.value }))} />
            </div>
            <button type="button" className="pill-btn pill-btn-ghost" onClick={agregarVariante}>+ Agregar talle/color</button>
          </div>
        )}
      </div>

      {movHistorial && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="toolbar">
            <h4 style={{ marginRight: "auto" }}>Historial de movimientos</h4>
            <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => setMovHistorial(null)}>Cerrar</button>
          </div>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead>
            <tbody>
              {movHistorial.rows.map((m) => (
                <tr key={m.id}>
                  <td>{formatoFecha(m.creado_en)}</td>
                  <td>{m.tipo}</td>
                  <td>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                  <td>{m.motivo || "—"}</td>
                  <td>{m.usuario_nombre || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VarianteFila({ variante, esAdmin, onMovimiento, onVerHistorial }) {
  const [tipo, setTipo] = useState("ingreso");
  const [cantidad, setCantidad] = useState("");
  const bajoStock = variante.stock_actual <= variante.stock_minimo;

  return (
    <tr className={bajoStock ? "fila-alerta" : ""}>
      <td>{variante.talle}</td>
      <td>{variante.color}</td>
      <td>{variante.stock_actual}</td>
      <td>{variante.stock_minimo}</td>
      <td><span className={`badge ${variante.activo ? "badge-success" : "badge-muted"}`}>{variante.activo ? "Activa" : "Inactiva"}</span></td>
      {esAdmin && (
        <td>
          <div className="movimiento-form">
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_MOVIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="input" type="number" placeholder={tipo === "ajuste" ? "+/-" : "cantidad"} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            <button
              type="button"
              className="pill-btn pill-btn-ghost pill-btn-sm"
              onClick={() => { onMovimiento(variante.id, tipo, cantidad, ""); setCantidad(""); }}
            >
              Aplicar
            </button>
            <button type="button" className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => onVerHistorial(variante.id)}>Historial</button>
          </div>
        </td>
      )}
    </tr>
  );
}
