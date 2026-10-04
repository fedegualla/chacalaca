import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiJson } from "../../api/client.js";
import ProductCard from "../../components/ProductCard.jsx";
import "./Catalogo.css";

const PAGINA = 24;

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [descuentoPct, setDescuentoPct] = useState(0);

  const q = params.get("q") || "";
  const categoria = params.get("categoria") || "";
  const destacado = params.get("destacado") || "";
  const orden = params.get("orden") || "";

  useEffect(() => {
    apiJson("/categorias").then(setCategorias).catch(() => {});
    apiJson("/configuracion/publica").then((c) => setDescuentoPct(Number(c.descuento_efectivo_transferencia) || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    const query = new URLSearchParams({ q, categoria, destacado, orden, limit: PAGINA, offset: 0 });
    apiJson(`/catalogo?${query}`)
      .then((d) => {
        setProductos(d.productos);
        setTotal(d.total);
      })
      .finally(() => setCargando(false));
  }, [q, categoria, destacado, orden]);

  function actualizarParam(clave, valor) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    setParams(nuevos);
  }

  async function verMas() {
    const query = new URLSearchParams({ q, categoria, destacado, orden, limit: PAGINA, offset: productos.length });
    const d = await apiJson(`/catalogo?${query}`);
    setProductos((prev) => [...prev, ...d.productos]);
  }

  return (
    <div className="container catalogo">
      <div className="catalogo-filtros">
        <input
          className="input"
          placeholder="Buscar productos..."
          defaultValue={q}
          onKeyDown={(e) => e.key === "Enter" && actualizarParam("q", e.target.value)}
        />
        <div className="catalogo-chips">
          <button className={`chip ${!categoria ? "activo" : ""}`} onClick={() => actualizarParam("categoria", "")}>
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              className={`chip ${categoria === c.slug ? "activo" : ""}`}
              onClick={() => actualizarParam("categoria", c.slug)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
        <select className="input catalogo-orden" value={orden} onChange={(e) => actualizarParam("orden", e.target.value)}>
          <option value="">Sin ordenar</option>
          <option value="nombre_asc">A → Z</option>
          <option value="nombre_desc">Z → A</option>
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
        </select>
      </div>

      <div className="catalogo-header">
        <h2>Todos los productos</h2>
        <span className="venta-sub">{total} producto{total !== 1 ? "s" : ""}</span>
      </div>

      {cargando ? (
        <p className="spinner-text">Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p className="spinner-text">No encontramos productos con esos filtros.</p>
      ) : (
        <>
          <div className="home-grid">
            {productos.map((p) => <ProductCard key={p.id} producto={p} descuentoPct={descuentoPct} />)}
          </div>
          {productos.length < total && (
            <div className="catalogo-ver-mas">
              <button className="pill-btn pill-btn-outline" onClick={verMas}>Ver más productos ↓</button>
              <p className="venta-sub">Mostrando {productos.length} de {total}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
