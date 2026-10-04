import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client.js";
import "./Productos.css";

export default function ProductoNuevo() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState({ nombre: "", categoria_id: "", marca: "", precio_costo: "", precio_venta: "", descripcion: "" });
  const [variantes, setVariantes] = useState([]);
  const [nuevaVariante, setNuevaVariante] = useState({ talle: "", color: "", stock_actual: "", stock_minimo: "2" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { apiJson("/categorias").then(setCategorias).catch(() => {}); }, []);

  function campo(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function agregarVariante() {
    if (!nuevaVariante.talle.trim() || !nuevaVariante.color.trim()) return;
    setVariantes((v) => [...v, { ...nuevaVariante }]);
    setNuevaVariante({ talle: "", color: "", stock_actual: "", stock_minimo: "2" });
  }

  function quitarVariante(i) {
    setVariantes((v) => v.filter((_, idx) => idx !== i));
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    setEnviando(true);
    try {
      const producto = await apiJson("/productos", {
        method: "POST",
        body: JSON.stringify({ ...form, categoria_id: form.categoria_id || null, variantes })
      });
      navigate(`/productos/${producto.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h2>Nuevo producto</h2>
      <form className="card producto-form" onSubmit={guardar}>
        <div className="field"><label className="label">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} required />
        </div>
        <div className="producto-form-grid">
          <div className="field"><label className="label">Categoría</label>
            <select className="input" value={form.categoria_id} onChange={(e) => campo("categoria_id", e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Marca</label>
            <input className="input" value={form.marca} onChange={(e) => campo("marca", e.target.value)} />
          </div>
          <div className="field"><label className="label">Precio de costo</label>
            <input className="input" type="number" min="0" step="0.01" value={form.precio_costo} onChange={(e) => campo("precio_costo", e.target.value)} />
          </div>
          <div className="field"><label className="label">Precio de venta</label>
            <input className="input" type="number" min="0" step="0.01" value={form.precio_venta} onChange={(e) => campo("precio_venta", e.target.value)} required />
          </div>
        </div>
        <div className="field"><label className="label">Descripción</label>
          <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => campo("descripcion", e.target.value)} />
        </div>

        <h4>Talles y colores (variantes)</h4>
        <div className="variantes-tabla-wrap">
          {variantes.length > 0 && (
            <table className="table">
              <thead><tr><th>Talle</th><th>Color</th><th>Stock inicial</th><th>Stock mínimo</th><th></th></tr></thead>
              <tbody>
                {variantes.map((v, i) => (
                  <tr key={i}>
                    <td>{v.talle}</td><td>{v.color}</td><td>{v.stock_actual || 0}</td><td>{v.stock_minimo || 0}</td>
                    <td><button type="button" className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => quitarVariante(i)}>Quitar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
        </div>

        {error && <div className="error-text">{error}</div>}
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button className="pill-btn pill-btn-primary" disabled={enviando}>{enviando ? "Guardando..." : "Guardar producto"}</button>
        </div>
      </form>
    </div>
  );
}
