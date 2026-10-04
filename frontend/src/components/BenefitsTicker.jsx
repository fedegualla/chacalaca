import "./BenefitsTicker.css";

const BENEFICIOS = [
  "Envíos a todo el país",
  "Descuento por efectivo o transferencia",
  "Pagá con tarjeta vía Mercado Pago",
  "Retiro gratis en el local"
];

export default function BenefitsTicker() {
  const items = [...BENEFICIOS, ...BENEFICIOS];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((texto, i) => (
          <span className="ticker-item" key={i}>{texto}</span>
        ))}
      </div>
    </div>
  );
}
