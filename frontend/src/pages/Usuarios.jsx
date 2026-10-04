import { useEffect, useState } from "react";
import { apiJson } from "../api/client.js";
import "./Usuarios.css";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "vendedor" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function recargar() { apiJson("/usuarios").then(setUsuarios).catch((e) => setError(e.message)); }
  useEffect(recargar, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await apiJson("/usuarios", { method: "POST", body: JSON.stringify(form) });
      setForm({ nombre: "", email: "", password: "", rol: "vendedor" });
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function alternarActivo(u) {
    try {
      await apiJson(`/usuarios/${u.id}`, { method: "PUT", body: JSON.stringify({ activo: !u.activo }) });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Usuarios</h2>

      <form className="card usuarios-form" onSubmit={crear}>
        <h4>Nuevo usuario</h4>
        <div className="usuarios-form-grid">
          <div className="field"><label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="field"><label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="field"><label className="label">Contraseña</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="field"><label className="label">Rol</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="vendedor">Vendedor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="pill-btn pill-btn-primary" disabled={enviando}>{enviando ? "Creando..." : "Crear usuario"}</button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: "capitalize" }}>{u.rol}</td>
                <td><span className={`badge ${u.activo ? "badge-success" : "badge-muted"}`}>{u.activo ? "Activo" : "Inactivo"}</span></td>
                <td><button className="pill-btn pill-btn-ghost pill-btn-sm" onClick={() => alternarActivo(u)}>{u.activo ? "Desactivar" : "Activar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
