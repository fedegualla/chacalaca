import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash("prueba123", 10);
    await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
        ('Administrador', 'admin@prueba.com', $1, 'admin'),
        ('Vendedor', 'vendedor@prueba.com', $1, 'vendedor')
       ON CONFLICT (email) DO NOTHING`,
      [passwordHash]
    );

    const categorias = [
      { nombre: "Remeras", orden: 1 },
      { nombre: "Pantalones", orden: 2 },
      { nombre: "Camperas", orden: 3 },
      { nombre: "Conjuntos", orden: 4 },
      { nombre: "Accesorios", orden: 5 }
    ];
    const categoriaIds = {};
    for (const cat of categorias) {
      const { rows } = await client.query(
        "INSERT INTO categorias (nombre, orden) VALUES ($1, $2) RETURNING id",
        [cat.nombre, cat.orden]
      );
      categoriaIds[cat.nombre] = rows[0].id;
    }

    const productos = [
      { nombre: "Remera estampada dinosaurio", categoria: "Remeras", marca: "Chacalaca Kids", costo: 3500, venta: 7900, talles: ["2", "4", "6", "8"], colores: ["Celeste", "Verde"] },
      { nombre: "Pantalón de jogging", categoria: "Pantalones", marca: "Chacalaca Kids", costo: 4200, venta: 9500, talles: ["2", "4", "6", "8", "10"], colores: ["Gris", "Negro"] },
      { nombre: "Campera inflable", categoria: "Camperas", marca: "Chacalaca Kids", costo: 9800, venta: 21000, talles: ["4", "6", "8"], colores: ["Rojo", "Azul"] },
      { nombre: "Conjunto buzo + pantalón", categoria: "Conjuntos", marca: "Chacalaca Kids", costo: 7200, venta: 15800, talles: ["2", "4", "6"], colores: ["Rosa", "Beige"] },
      { nombre: "Gorro de lana", categoria: "Accesorios", marca: "Chacalaca Kids", costo: 1200, venta: 3200, talles: ["Único"], colores: ["Multicolor"] }
    ];

    for (const p of productos) {
      const { rows } = await client.query(
        `INSERT INTO productos (nombre, categoria_id, marca, precio_costo, precio_venta)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [p.nombre, categoriaIds[p.categoria], p.marca, p.costo, p.venta]
      );
      const productoId = rows[0].id;
      for (const talle of p.talles) {
        for (const color of p.colores) {
          const sku = `${productoId}-${talle}-${color}`.toUpperCase().replace(/\s+/g, "");
          await client.query(
            `INSERT INTO variantes_producto (producto_id, talle, color, sku, stock_actual, stock_minimo)
             VALUES ($1, $2, $3, $4, $5, 2)`,
            [productoId, talle, color, sku, Math.floor(Math.random() * 15) + 1]
          );
        }
      }
    }

    await client.query("COMMIT");
    console.log("Seed cargado: 2 usuarios, 5 categorías, 5 productos con variantes y stock.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Error al cargar el seed:", err.message);
  process.exit(1);
});
