import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson, guardarSesionStaff } from "../../api/client.js";
import "./LoginStaff.css";

export default function LoginStaff() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await apiJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      guardarSesionStaff(data.token, data.usuario);
      navigate("/staff/venta");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="staff-login">
      <form className="card staff-login-card" onSubmit={enviar}>
        <h2 className="staff-login-titulo">Ingreso de personal</h2>
        <p className="staff-login-sub">Chacalaca · Panel interno</p>

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
    </div>
  );
}
