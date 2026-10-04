import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "chacalaca_carrito";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function agregar(item, cantidad = 1) {
    setItems((prev) => {
      const existente = prev.find((i) => i.variante_id === item.variante_id);
      if (existente) {
        return prev.map((i) =>
          i.variante_id === item.variante_id
            ? { ...i, cantidad: Math.min(i.cantidad + cantidad, i.stock) }
            : i
        );
      }
      return [...prev, { ...item, cantidad: Math.min(cantidad, item.stock) }];
    });
    setAbierto(true);
  }

  function quitar(variante_id) {
    setItems((prev) => prev.filter((i) => i.variante_id !== variante_id));
  }

  function actualizarCantidad(variante_id, cantidad) {
    setItems((prev) =>
      prev.map((i) =>
        i.variante_id === variante_id
          ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) }
          : i
      )
    );
  }

  function vaciar() {
    setItems([]);
  }

  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);
  const subtotal = items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, agregar, quitar, actualizarCantidad, vaciar, cantidadTotal, subtotal, abierto, setAbierto }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
