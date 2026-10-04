import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { apiRouter } from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
// El webhook de Mercado Pago necesita el body crudo disponible como JSON igual
// que el resto; express.json() alcanza porque MP manda Content-Type: application/json.
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api", apiRouter);

// En producción, este mismo servidor sirve el build del frontend (ver render.yaml).
const distPath = join(__dirname, "../../frontend/dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(join(distPath, "index.html")));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Chacalaca backend escuchando en :${port}`));
