import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson, formatoPrecio, usuarioActual } from "../api/client.js";
import "./Productos.css";

export default function Productos() {
  const esAdmin = usuarioActual()?.rol === "admin";
  const [searchParams] = useSearchParams();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [variantesStockBajo, setVariantesStockBajo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson("/categorias").then(setCategorias).catch(() => {});
    if (searchParams.get("stockBajo")) {
      apiJson("/productos/alertas/stock-bajo").then((rows) => {
        setVariantesStockBajo(new Set(rows.map((r) => r.producto_id)));
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      apiJson(`/productos?q=${encodeURIComponent(q)}&categoria_id=${categoriaId}`)
        .then(setProductos)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, categoriaId]);

  return (
    <div>
      <div className="toolbar">
        <h2 style={{ marginRight: "auto" }}>Productos y stock</h2>
        {esAdmin && <Link className="pill-btn pill-btn-primary" to="/productos/nuevo">+ Nuevo producto</Link>}
      </div>

      <div className="toolbar">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 220 }} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Producto</th><th>Categoría</th><th>Precio venta</th><th>Stock total</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={variantesStockBajo?.has(p.id) ? "fila-alerta" : ""}>
                <td><Link to={`/productos/${p.id}`}>{p.nombre}</Link>{p.marca && <div className="productos-marca">{p.marca}</div>}</td>
                <td>{p.categoria_nombre || "—"}</td>
                <td>{formatoPrecio(p.precio_venta)}</td>
                <td>{p.stock_total}</td>
                <td><span className={`badge ${p.activo ? "badge-success" : "badge-muted"}`}>{p.activo ? "Activo" : "Inactivo"}</span></td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr><td colSpan={5} className="productos-vacio">No se encontraron productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
