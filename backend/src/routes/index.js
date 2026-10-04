import { Router } from "express";
import { authRouter } from "./auth.js";
import { categoriasRouter } from "./categorias.js";
import { productosRouter } from "./productos.js";
import { ventasRouter } from "./ventas.js";
import { mercadopagoRouter } from "./mercadopago.js";
import { usuariosRouter } from "./usuarios.js";
import { configuracionRouter } from "./configuracion.js";
import { reportesRouter } from "./reportes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/categorias", categoriasRouter);
apiRouter.use("/productos", productosRouter);
apiRouter.use("/ventas", ventasRouter);
apiRouter.use("/mercadopago", mercadopagoRouter);
apiRouter.use("/usuarios", usuariosRouter);
apiRouter.use("/configuracion", configuracionRouter);
apiRouter.use("/reportes", reportesRouter);
