const TOKEN_KEY = "chacalaca_token";
const USUARIO_KEY = "chacalaca_usuario";

export function guardarSesion(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export function usuarioActual() {
  try {
    return JSON.parse(localStorage.getItem(USUARIO_KEY));
  } catch {
    return null;
  }
}

export async function apiJson(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (res.status === 401) {
    cerrarSesion();
    window.location.href = "/login";
    throw new Error("Sesión vencida.");
  }

  const texto = await res.text();
  const data = texto ? JSON.parse(texto) : null;
  if (!res.ok) throw new Error(data?.error || "Ocurrió un error inesperado.");
  return data;
}

export function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(valor) || 0);
}

export function formatoFecha(valor) {
  return new Date(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}
