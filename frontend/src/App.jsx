import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { RutaProtegida, RutaAdmin } from "./components/RutaProtegida.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Venta from "./pages/Venta.jsx";
import Ventas from "./pages/Ventas.jsx";
import Productos from "./pages/Productos.jsx";
import ProductoNuevo from "./pages/ProductoNuevo.jsx";
import ProductoDetalle from "./pages/ProductoDetalle.jsx";
import Categorias from "./pages/Categorias.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Configuracion from "./pages/Configuracion.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/venta" element={<Venta />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:id" element={<ProductoDetalle />} />
          <Route path="/categorias" element={<Categorias />} />

          <Route element={<RutaAdmin />}>
            <Route path="/productos/nuevo" element={<ProductoNuevo />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
