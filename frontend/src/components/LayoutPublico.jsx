import { useEffect, useState } from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import BenefitsTicker from "./BenefitsTicker.jsx";
import CartDrawer from "./CartDrawer.jsx";
import { apiJson } from "../api/client.js";

export default function LayoutPublico({ children }) {
  const [config, setConfig] = useState({});

  useEffect(() => {
    apiJson("/configuracion/publica").then(setConfig).catch(() => {});
  }, []);

  return (
    <>
      <BenefitsTicker />
      <Header />
      <main>{children}</main>
      <Footer config={config} />
      <CartDrawer />
    </>
  );
}
