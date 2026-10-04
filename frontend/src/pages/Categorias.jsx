import { useEffect, useState } from "react";
import { apiJson, usuarioActual } from "../api/client.js";
import "./Categorias.css";

export default function Categorias() {
  const esAdmin = usuarioActual()?.rol === "admin";
  const [categorias, setCategorias] = useState([]);
  const [nombreNueva, setNombreNueva] = useState("");
  const [error, setError] = useState("");

  function recargar() {
    apiJson("/categorias").then(setCategorias).catch((e) => setError(e.message));
  }

  useEffect(recargar, []);

  async function agregar(e) {
    e.preventDefault();
    if (!nombreNueva.trim()) return;
    try {
      await apiJson("/categorias", { method: "POST", body: JSON.stringify({ nombre: nombreNueva.trim() }) });
      setNombreNueva("");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function alternarActiva(cat) {
    try {
      await apiJson(`/categorias/${cat.id}`, { method: "PUT", body: JSON.stringify({ activa: !cat.activa }) });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(cat) {
    if (!confirm(`¿Borrar la categoría "${cat.nombre}"?`)) return;
    try {
      await apiJson(`/categorias/${cat.id}`, { method: "DELETE" });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Categorías</h2>
      {error && <div className="error-text">{error}</div>}

      {esAdmin && (
        <form className="card categorias-form" onSubmit={agregar}>
          <input
            className="input"
            placeholder="Nombre de la categoría nueva..."
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
          />
          <button className="pill-btn pill-btn-primary" disabled={!nombreNueva.trim()}>Agregar</button>
        </form>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>Nombre</th><th>Estado</th>{esAdmin && <th></th>}</tr></thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td><span className={`badge ${c.activa ? "badge-success" : "badge-muted"}`}>{c.activa ? "Activa" : "Inactiva"}</span></td>
                {esAdmin && (
                  <td className="categorias-acciones">
                    <button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => alternarActiva(c)}>
                      {c.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button className="pill-btn pill-btn-danger pill-btn-sm" onClick={() => borrar(c)}>Borrar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
