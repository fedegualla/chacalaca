import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson, guardarSesionCliente } from "../../api/client.js";
import "./LoginCliente.css";

export default function LoginCliente() {
  const [modo, setModo] = useState("login");
  const navigate = useNavigate();

  return (
    <div className="container cliente-auth">
      <div className="card cliente-auth-card">
        <div className="cliente-auth-tabs">
          <button className={modo === "login" ? "activo" : ""} onClick={() => setModo("login")}>Ingresar</button>
          <button className={modo === "registro" ? "activo" : ""} onClick={() => setModo("registro")}>Crear cuenta</button>
        </div>
        {modo === "login" ? (
          <FormLogin onOk={() => navigate("/mi-cuenta/pedidos")} />
        ) : (
          <FormRegistro onOk={() => navigate("/mi-cuenta/pedidos")} />
        )}
      </div>
    </div>
  );
}

function FormLogin({ onOk }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await apiJson("/auth-cliente/login", { method: "POST", body: JSON.stringify({ email, password }) });
      guardarSesionCliente(data.token, data.cliente);
      onOk();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      {error && <div className="error-text">{error}</div>}
      <div className="field">
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label className="label">Contraseña</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className="pill-btn pill-btn-primary pill-btn-block" disabled={cargando}>
        {cargando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

function FormRegistro({ onOk }) {
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", password: "", telefono: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await apiJson("/auth-cliente/registro", { method: "POST", body: JSON.stringify(form) });
      guardarSesionCliente(data.token, data.cliente);
      onOk();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      {error && <div className="error-text">{error}</div>}
      <div className="checkout-grid">
        <div className="field">
          <label className="label">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div className="field">
          <label className="label">Apellido</label>
          <input className="input" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
        </div>
      </div>
      <div className="field">
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="field">
        <label className="label">Teléfono</label>
        <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
      </div>
      <div className="field">
        <label className="label">Contraseña</label>
        <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
      </div>
      <button className="pill-btn pill-btn-primary pill-btn-block" disabled={cargando}>
        {cargando ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
