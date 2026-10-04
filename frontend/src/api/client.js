export function apiFetch(path, options = {}) {
  // El mismo navegador puede tener a la vez una sesión de cliente (tienda
  // online) y una de staff (panel interno) — se elige el token según la
  // sección en la que está parado, no cuál se logueó último.
  const enPanelStaff = window.location.pathname.startsWith("/staff");
  const token = enPanelStaff
    ? localStorage.getItem("token_staff")
    : localStorage.getItem("token_cliente");
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error inesperado.");
  return data;
}

// ---------- Sesión de staff (admin/vendedor) ----------

export function usuarioStaff() {
  const raw = localStorage.getItem("usuario_staff");
  return raw ? JSON.parse(raw) : null;
}

export function guardarSesionStaff(token, usuario) {
  localStorage.setItem("token_staff", token);
  localStorage.setItem("usuario_staff", JSON.stringify(usuario));
}

export function cerrarSesionStaff() {
  localStorage.removeItem("token_staff");
  localStorage.removeItem("usuario_staff");
}

// ---------- Sesión de cliente (tienda online) ----------

export function clienteActual() {
  const raw = localStorage.getItem("cliente");
  return raw ? JSON.parse(raw) : null;
}

export function guardarSesionCliente(token, cliente) {
  localStorage.setItem("token_cliente", token);
  localStorage.setItem("cliente", JSON.stringify(cliente));
}

export function cerrarSesionCliente() {
  localStorage.removeItem("token_cliente");
  localStorage.removeItem("cliente");
}

export function formatoPrecio(valor) {
  return Number(valor).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
