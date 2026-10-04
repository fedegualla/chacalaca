import { useEffect, useState } from "react";
import { apiJson } from "../api/client.js";
import "./Configuracion.css";

const CAMPOS = [
  { clave: "nombre_tienda", label: "Nombre de la tienda" },
  { clave: "direccion_local", label: "Dirección del local" },
  { clave: "telefono_local", label: "Teléfono" },
  { clave: "cuit", label: "CUIT" },
  { clave: "descuento_efectivo_transferencia", label: "Descuento efectivo/transferencia (%)", tipo: "number" },
  { clave: "stock_minimo_default", label: "Stock mínimo por defecto (alertas)", tipo: "number" },
  { clave: "mensaje_pie_ticket", label: "Mensaje al pie del ticket" }
];

export default function Configuracion() {
  const [config, setConfig] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { apiJson("/configuracion").then(setConfig).catch((e) => setError(e.message)); }, []);

  async function guardar(e) {
    e.preventDefault();
    setError(""); setMensaje("");
    setGuardando(true);
    try {
      const actualizado = await apiJson("/configuracion", { method: "PUT", body: JSON.stringify(config) });
      setConfig(actualizado);
      setMensaje("Configuración guardada.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (!config) return error ? <div className="error-text">{error}</div> : <p>Cargando...</p>;

  return (
    <div>
      <h2>Configuración</h2>
      <form className="card config-form" onSubmit={guardar}>
        {CAMPOS.map((c) => (
          <div className="field" key={c.clave}>
            <label className="label">{c.label}</label>
            <input
              className="input"
              type={c.tipo || "text"}
              value={config[c.clave] ?? ""}
              onChange={(e) => setConfig({ ...config, [c.clave]: e.target.value })}
            />
          </div>
        ))}

        <div className="field">
          <label className="label">Ancho del papel del ticket</label>
          <select className="input" value={config.ancho_ticket || "80"} onChange={(e) => setConfig({ ...config, ancho_ticket: e.target.value })}>
            <option value="80">80mm</option>
            <option value="58">58mm</option>
          </select>
        </div>

        {error && <div className="error-text">{error}</div>}
        {mensaje && <div className="ok-text">{mensaje}</div>}
        <button className="pill-btn pill-btn-primary" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
      </form>

      <div className="card config-mp-nota">
        <h4>Mercado Pago</h4>
        <p>
          El cobro con tarjeta y QR se configura con variables de entorno en el servidor
          (<code>MP_ACCESS_TOKEN</code>, <code>MP_WEBHOOK_SECRET</code>, <code>APP_BASE_URL</code>),
          no desde acá. Ver <code>backend/.env.example</code>.
        </p>
      </div>

      <div className="card config-mp-nota">
        <h4>Impresión de tickets</h4>
        <p>
          El ticket se imprime con el diálogo de impresión del navegador: conectá la impresora
          térmica a la PC como una impresora normal de Windows y elegila en ese diálogo
          (convenís dejarla como predeterminada para no tener que elegirla cada vez).
        </p>
      </div>
    </div>
  );
}
