import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson, guardarSesion } from "../api/client.js";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const { token, usuario } = await apiJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      guardarSesion(token, usuario);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-pantalla">
      <form className="card login-card" onSubmit={enviar}>
        <h2>Chacalaca</h2>
        <p className="login-sub">Gestión de stock y ventas</p>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Contraseña</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="pill-btn pill-btn-primary pill-btn-block" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
