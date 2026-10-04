// Única función que modifica stock_actual de una variante: siempre a través de
// un movimiento registrado, para que el historial de movimientos_stock sea la
// fuente de verdad de por qué cambió el stock.
export async function registrarMovimiento(client, { variante_id, tipo, cantidad, motivo, usuario_id, venta_id }) {
  const { rows } = await client.query(
    "UPDATE variantes_producto SET stock_actual = stock_actual + $1 WHERE id = $2 RETURNING stock_actual",
    [cantidad, variante_id]
  );
  if (!rows[0]) throw new Error(`La variante ${variante_id} no existe.`);
  if (rows[0].stock_actual < 0) {
    throw new Error("El movimiento dejaría el stock en negativo.");
  }
  await client.query(
    `INSERT INTO movimientos_stock (variante_id, tipo, cantidad, motivo, usuario_id, venta_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [variante_id, tipo, cantidad, motivo || null, usuario_id || null, venta_id || null]
  );
  return rows[0].stock_actual;
}
