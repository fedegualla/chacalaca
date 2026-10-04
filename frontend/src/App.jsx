import { Routes, Route, Navigate } from "react-router-dom";
import LayoutPublico from "./components/LayoutPublico.jsx";
import LayoutStaff from "./components/LayoutStaff.jsx";
import RutaProtegida from "./components/RutaProtegida.jsx";
import RutaProtegidaCliente from "./components/RutaProtegidaCliente.jsx";

// Público
import Home from "./pages/publico/Home.jsx";
import Catalogo from "./pages/publico/Catalogo.jsx";
import ProductoDetalle from "./pages/publico/ProductoDetalle.jsx";
import Checkout from "./pages/publico/Checkout.jsx";
import PedidoEstado from "./pages/publico/PedidoEstado.jsx";

// Cliente
import LoginCliente from "./pages/cliente/LoginCliente.jsx";
import MisPedidos from "./pages/cliente/MisPedidos.jsx";

// Staff
import LoginStaff from "./pages/vendedor/LoginStaff.jsx";
import PantallaVenta from "./pages/vendedor/PantallaVenta.jsx";
import PanelAdmin from "./pages/admin/PanelAdmin.jsx";

function Publica(pagina) {
  return <LayoutPublico>{pagina}</LayoutPublico>;
}

export default function App() {
  return (
    <Routes>
      {/* Tienda online */}
      <Route path="/" element={Publica(<Home />)} />
      <Route path="/catalogo" element={Publica(<Catalogo />)} />
      <Route path="/producto/:id" element={Publica(<ProductoDetalle />)} />
      <Route path="/checkout" element={Publica(<Checkout />)} />
      <Route path="/pedido/:id" element={Publica(<PedidoEstado />)} />
      <Route path="/ingresar" element={Publica(<LoginCliente />)} />
      <Route
        path="/mi-cuenta/pedidos"
        element={Publica(
          <RutaProtegidaCliente>
            <MisPedidos />
          </RutaProtegidaCliente>
        )}
      />

      {/* Panel interno (staff) */}
      <Route path="/staff/login" element={<LoginStaff />} />
      <Route
        path="/staff/venta"
        element={
          <RutaProtegida>
            <LayoutStaff>
              <PantallaVenta />
            </LayoutStaff>
          </RutaProtegida>
        }
      />
      <Route
        path="/staff/admin/*"
        element={
          <RutaProtegida rolesPermitidos={["admin"]}>
            <LayoutStaff>
              <PanelAdmin />
            </LayoutStaff>
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
