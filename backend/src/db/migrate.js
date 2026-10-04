import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrar() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Migración aplicada correctamente.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrar().catch((err) => {
  console.error("Error al migrar:", err.message);
  process.exit(1);
});
