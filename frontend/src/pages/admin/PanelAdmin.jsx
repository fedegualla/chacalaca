import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, formatoPrecio } from "../../api/client.js";
import "./PanelAdmin.css";

const SECCIONES = [
  { id: "productos", label: "Productos" },
  { id: "pedidos", label: "Pedidos" },
  { id: "categorias", label: "Categorías" },
  { id: "configuracion", label: "Configuración" }
];

export default function PanelAdmin() {
  const [seccion, setSeccion] = useState("productos");

  return (
    <div className="panel">
      <div className="panel-sidebar">
        <h2>Administración</h2>
        <Link to="/staff/venta" className="panel-volver">← Volver a venta</Link>
        {SECCIONES.map((s) => (
          <button key={s.id} className={seccion === s.id ? "activo" : ""} onClick={() => setSeccion(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="panel-contenido">
        {seccion === "productos" && <ProductosSeccion />}
        {seccion === "pedidos" && <PedidosSeccion />}
        {seccion === "categorias" && <CategoriasSeccion />}
        {seccion === "configuracion" && <ConfiguracionSeccion />}
      </div>
    </div>
  );
}

// ---------------- PRODUCTOS ----------------

function ProductosSeccion() {
  const [productos, setProductos] = useState([]);
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState(null); // null | "nuevo" | producto detallado

  function cargar() {
    apiJson(`/productos?q=${encodeURIComponent(q)}`).then(setProductos).catch(() => {});
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function abrirEdicion(id) {
    const detalle = await apiJson(`/productos/${id}`);
    setEditando(detalle);
  }

  if (editando) {
    return (
      <ProductoForm
        producto={editando === "nuevo" ? null : editando}
        onVolver={() => {
          setEditando(null);
          cargar();
        }}
      />
    );
  }

  return (
    <div>
      <div className="panel-header">
        <h3>Productos</h3>
        <button className="pill-btn pill-btn-primary pill-btn-sm" onClick={() => setEditando("nuevo")}>+ Nuevo producto</button>
      </div>
      <input className="input" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320, marginBottom: 16 }} />

      <table className="panel-tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock total</th>
            <th>Variantes</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{p.categoria_nombre || "—"}</td>
              <td>{formatoPrecio(p.precio_venta)}</td>
              <td>{p.stock_total}</td>
              <td>{p.cantidad_variantes}</td>
              <td>{p.activo ? <span className="badge badge-disponible">Activo</span> : <span className="badge badge-agotado">Inactivo</span>}</td>
              <td><button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => abrirEdicion(p.id)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductoForm({ producto, onVolver }) {
  const [form, setForm] = useState({
    nombre: producto?.nombre || "",
    descripcion: producto?.descripcion || "",
    categoria_id: producto?.categoria_id || "",
    marca: producto?.marca || "",
    precio_costo: producto?.precio_costo || 0,
    precio_venta: producto?.precio_venta || "",
    imagen_url: producto?.imagen_url || "",
    destacado: producto?.destacado || false
  });
  const [categorias, setCategorias] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [productoId, setProductoId] = useState(producto?.id || null);
  const [variantes, setVariantes] = useState(producto?.variantes || []);
  const [sucursales, setSucursales] = useState([]);
  const [nuevaVariante, setNuevaVariante] = useState({ talle: "", color: "" });

  useEffect(() => {
    apiJson("/categorias/todas").then(setCategorias).catch(() => {});
    apiJson("/sucursales").then(setSucursales).catch(() => {});
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      if (productoId) {
        await apiJson(`/productos/${productoId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        const creado = await apiJson("/productos", { method: "POST", body: JSON.stringify(form) });
        setProductoId(creado.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function agregarVariante(e) {
    e.preventDefault();
    if (!productoId) return setError("Guardá el producto antes de agregar variantes.");
    try {
      await apiJson(`/productos/${productoId}/variantes`, { method: "POST", body: JSON.stringify(nuevaVariante) });
      const detalle = await apiJson(`/productos/${productoId}`);
      setVariantes(detalle.variantes);
      setNuevaVariante({ talle: "", color: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function actualizarStock(varianteId, sucursalId, cantidad) {
    await apiJson(`/productos/variantes/${varianteId}/stock`, {
      method: "PUT",
      body: JSON.stringify({ sucursal_id: sucursalId, cantidad: Number(cantidad) })
    });
    const detalle = await apiJson(`/productos/${productoId}`);
    setVariantes(detalle.variantes);
  }

  return (
    <div>
      <button className="panel-volver" onClick={onVolver} style={{ marginBottom: 16 }}>← Volver al listado</button>
      <h3>{productoId ? "Editar producto" : "Nuevo producto"}</h3>
      {error && <div className="error-text">{error}</div>}

      <form className="card panel-form" onSubmit={guardar}>
        <div className="field">
          <label className="label">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div className="field">
          <label className="label">Descripción</label>
          <textarea className="input" rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div className="panel-form-grid">
          <div className="field">
            <label className="label">Categoría</label>
            <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Marca</label>
            <input className="input" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Precio costo</label>
            <input className="input" type="number" value={form.precio_costo} onChange={(e) => setForm({ ...form, precio_costo: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Precio de venta</label>
            <input className="input" type="number" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} required />
          </div>
        </div>
        <div className="field">
          <label className="label">URL de imagen</label>
          <input className="input" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://..." />
        </div>
        <label className="panel-checkbox">
          <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} />
          Destacado en la página principal
        </label>

        <button className="pill-btn pill-btn-primary" disabled={guardando}>{guardando ? "Guardando..." : "Guardar producto"}</button>
      </form>

      {productoId && (
        <div className="card panel-form" style={{ marginTop: 20 }}>
          <h4>Talles y colores</h4>
          <table className="panel-tabla">
            <thead><tr><th>Talle</th><th>Color</th>{sucursales.map((s) => <th key={s.id}>Stock {s.nombre}</th>)}</tr></thead>
            <tbody>
              {variantes.map((v) => (
                <tr key={v.id}>
                  <td>{v.talle}</td>
                  <td>{v.color}</td>
                  {sucursales.map((s) => {
                    const stockRow = v.stock.find((st) => st.sucursal_id === s.id);
                    return (
                      <td key={s.id}>
                        <input
                          className="input panel-stock-input"
                          type="number"
                          defaultValue={stockRow?.cantidad ?? 0}
                          onBlur={(e) => actualizarStock(v.id, s.id, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <form className="panel-nueva-variante" onSubmit={agregarVariante}>
            <input className="input" placeholder="Talle (ej: M)" value={nuevaVariante.talle} onChange={(e) => setNuevaVariante({ ...nuevaVariante, talle: e.target.value })} required />
            <input className="input" placeholder="Color" value={nuevaVariante.color} onChange={(e) => setNuevaVariante({ ...nuevaVariante, color: e.target.value })} required />
            <button className="pill-btn pill-btn-ghost pill-btn-sm">+ Agregar variante</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------- PEDIDOS ----------------

const ESTADOS_PEDIDO = ["pendiente", "confirmado", "preparando", "enviado", "entregado", "cancelado"];

function PedidosSeccion() {
  const [pedidos, setPedidos] = useState([]);
  const [estado, setEstado] = useState("");
  const [origen, setOrigen] = useState("");
  const [abierto, setAbierto] = useState(null);

  function cargar() {
    const params = new URLSearchParams({ estado, origen });
    apiJson(`/pedidos?${params}`).then(setPedidos).catch(() => {});
  }

  useEffect(cargar, [estado, origen]);

  async function cambiarEstado(id, estado_pedido) {
    await apiJson(`/pedidos/${id}/estado`, { method: "PUT", body: JSON.stringify({ estado_pedido }) });
    cargar();
  }

  return (
    <div>
      <h3>Pedidos</h3>
      <div className="panel-filtros">
        <select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="input" value={origen} onChange={(e) => setOrigen(e.target.value)}>
          <option value="">Todos los orígenes</option>
          <option value="online">Online</option>
          <option value="local">Local</option>
        </select>
      </div>

      <table className="panel-tabla">
        <thead>
          <tr><th>#</th><th>Fecha</th><th>Origen</th><th>Contacto</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <Fragment key={p.id}>
              <tr>
                <td>{p.id}</td>
                <td>{new Date(p.fecha).toLocaleString("es-AR")}</td>
                <td>{p.origen}</td>
                <td>{p.nombre_contacto}</td>
                <td>{formatoPrecio(p.total)}</td>
                <td>
                  <span className={`badge ${p.estado_pago === "aprobado" ? "badge-disponible" : "badge-soft"}`}>{p.estado_pago}</span>
                </td>
                <td>
                  <select className="input panel-select-estado" value={p.estado_pedido} onChange={(e) => cambiarEstado(p.id, e.target.value)}>
                    {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td><button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => setAbierto(abierto === p.id ? null : p.id)}>Ver</button></td>
              </tr>
              {abierto === p.id && (
                <tr>
                  <td colSpan={8}>
                    <DetallePedido id={p.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetallePedido({ id }) {
  const [pedido, setPedido] = useState(null);
  useEffect(() => { apiJson(`/pedidos/${id}`).then(setPedido).catch(() => {}); }, [id]);
  if (!pedido) return <p className="venta-sub">Cargando...</p>;
  return (
    <div className="panel-detalle-pedido">
      <p><strong>Contacto:</strong> {pedido.nombre_contacto} — {pedido.telefono_contacto}</p>
      {pedido.tipo_entrega === "envio_domicilio" && (
        <p><strong>Envío a:</strong> {pedido.direccion_envio}, {pedido.ciudad} ({pedido.codigo_postal})</p>
      )}
      {pedido.notas && <p><strong>Notas:</strong> {pedido.notas}</p>}
      <ul>
        {pedido.items.map((i) => (
          <li key={i.id}>{i.cantidad}x {i.producto_nombre} ({i.talle}/{i.color}) — {formatoPrecio(i.precio_unitario)}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- CATEGORÍAS ----------------

function CategoriasSeccion() {
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({ nombre: "", icono: "👕" });
  const [error, setError] = useState("");

  function cargar() {
    apiJson("/categorias/todas").then(setCategorias).catch(() => {});
  }
  useEffect(cargar, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    try {
      await apiJson("/categorias", { method: "POST", body: JSON.stringify(form) });
      setForm({ nombre: "", icono: "👕" });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(id) {
    await apiJson(`/categorias/${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div>
      <h3>Categorías</h3>
      {error && <div className="error-text">{error}</div>}
      <form className="panel-nueva-variante" onSubmit={crear}>
        <input className="input" placeholder="Ícono" style={{ maxWidth: 70 }} value={form.icono} onChange={(e) => setForm({ ...form, icono: e.target.value })} />
        <input className="input" placeholder="Nombre de la categoría" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <button className="pill-btn pill-btn-primary pill-btn-sm">+ Agregar</button>
      </form>

      <table className="panel-tabla" style={{ marginTop: 16 }}>
        <thead><tr><th></th><th>Nombre</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {categorias.map((c) => (
            <tr key={c.id}>
              <td>{c.icono}</td>
              <td>{c.nombre}</td>
              <td>{c.activa ? <span className="badge badge-disponible">Activa</span> : <span className="badge badge-agotado">Inactiva</span>}</td>
              <td>{c.activa && <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => borrar(c.id)}>Desactivar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- CONFIGURACIÓN ----------------

function ConfiguracionSeccion() {
  const [config, setConfig] = useState([]);
  const [guardando, setGuardando] = useState("");

  function cargar() {
    apiJson("/configuracion").then(setConfig).catch(() => {});
  }
  useEffect(cargar, []);

  async function guardar(clave, valor) {
    setGuardando(clave);
    await apiJson(`/configuracion/${clave}`, { method: "PUT", body: JSON.stringify({ valor }) });
    setGuardando("");
  }

  return (
    <div>
      <h3>Configuración</h3>
      <div className="card panel-form">
        {config.map((c) => (
          <div className="field" key={c.clave}>
            <label className="label">{c.clave}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" defaultValue={c.valor} onBlur={(e) => guardar(c.clave, e.target.value)} />
              {guardando === c.clave && <span className="venta-sub">Guardando...</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
