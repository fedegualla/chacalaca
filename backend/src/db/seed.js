import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

async function seed() {
  try {
    const { rows: sucursales } = await pool.query(`
      INSERT INTO sucursales (nombre, direccion)
      VALUES ('Local principal', 'Dirección de prueba 123')
      RETURNING id, nombre
    `);
    const [local] = sucursales;

    const passwordHash = await bcrypt.hash("prueba123", 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, sucursal_id)
       VALUES
        ('Admin Prueba', 'admin@prueba.com', $1, 'admin', $2),
        ('Vendedor Prueba', 'vendedor@prueba.com', $1, 'vendedor', $2)`,
      [passwordHash, local.id]
    );

    const { rows: categorias } = await pool.query(`
      INSERT INTO categorias (nombre, slug, icono, orden) VALUES
        ('Remeras', 'remeras', '👕', 1),
        ('Pantalones', 'pantalones', '👖', 2),
        ('Camperas', 'camperas', '🧥', 3),
        ('Vestidos', 'vestidos', '👗', 4),
        ('Calzado', 'calzado', '👟', 5),
        ('Accesorios', 'accesorios', '🧢', 6)
      RETURNING id, nombre, slug
    `);
    const catPorSlug = Object.fromEntries(categorias.map((c) => [c.slug, c]));

    const productosDemo = [
      { nombre: "Remera Oversize Básica", categoria: "remeras", marca: "Chacalaca", precio: 15000, talles: ["S", "M", "L", "XL"], colores: ["Negro", "Blanco", "Beige"] },
      { nombre: "Remera Estampada", categoria: "remeras", marca: "Chacalaca", precio: 17500, talles: ["S", "M", "L"], colores: ["Blanco", "Gris"] },
      { nombre: "Jean Mom Fit", categoria: "pantalones", marca: "Chacalaca", precio: 38000, talles: ["36", "38", "40", "42"], colores: ["Azul"] },
      { nombre: "Pantalón Cargo", categoria: "pantalones", marca: "Chacalaca", precio: 34000, talles: ["S", "M", "L", "XL"], colores: ["Verde", "Beige"] },
      { nombre: "Campera Puffer", categoria: "camperas", marca: "Chacalaca", precio: 62000, talles: ["S", "M", "L"], colores: ["Negro", "Bordo"] },
      { nombre: "Vestido Lino", categoria: "vestidos", marca: "Chacalaca", precio: 29500, talles: ["S", "M", "L"], colores: ["Blanco", "Celeste"] },
      { nombre: "Zapatillas Urbanas", categoria: "calzado", marca: "Chacalaca", precio: 48000, talles: ["37", "38", "39", "40", "41"], colores: ["Blanco"] },
      { nombre: "Gorra Visera Curva", categoria: "accesorios", marca: "Chacalaca", precio: 9500, talles: ["Único"], colores: ["Negro", "Blanco"] }
    ];

    for (const p of productosDemo) {
      const { rows: prodRows } = await pool.query(
        `INSERT INTO productos (nombre, categoria_id, marca, precio_costo, precio_venta, destacado)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [p.nombre, catPorSlug[p.categoria].id, p.marca, Math.round(p.precio * 0.5), p.precio, Math.random() > 0.5]
      );
      const productoId = prodRows[0].id;

      for (const talle of p.talles) {
        for (const color of p.colores) {
          const { rows: varRows } = await pool.query(
            `INSERT INTO variantes_producto (producto_id, talle, color) VALUES ($1,$2,$3) RETURNING id`,
            [productoId, talle, color]
          );
          await pool.query(
            "INSERT INTO stock (variante_id, sucursal_id, cantidad) VALUES ($1,$2,$3)",
            [varRows[0].id, local.id, Math.floor(Math.random() * 15) + 1]
          );
        }
      }
    }

    console.log("✅ Datos de prueba creados:");
    console.log(`   Sucursal: ${local.nombre} (id ${local.id})`);
    console.log("   Usuario admin    → admin@prueba.com    / prueba123");
    console.log("   Usuario vendedor → vendedor@prueba.com / prueba123");
    console.log(`   ${productosDemo.length} productos con variantes de talle/color cargados.`);
  } catch (err) {
    console.error("❌ Error cargando datos de prueba:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
