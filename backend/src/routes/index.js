import { Router } from "express";
import { authRouter } from "./auth.js";
import { authClientesRouter } from "./auth-clientes.js";
import { categoriasRouter } from "./categorias.js";
import { catalogoRouter } from "./catalogo.js";
import { configuracionRouter } from "./configuracion.js";
import { productosRouter } from "./productos.js";
import { pedidosRouter } from "./pedidos.js";
import { sucursalesRouter } from "./sucursales.js";
import { mercadopagoRouter } from "./mercadopago.js";
import { requiereAuth } from "../middleware/auth.js";

export const apiRouter = Router();

// Públicas (o con auth resuelta adentro del propio router)
apiRouter.use("/auth", authRouter);
apiRouter.use("/auth-cliente", authClientesRouter);
apiRouter.use("/categorias", categoriasRouter);
apiRouter.use("/catalogo", catalogoRouter);
apiRouter.use("/configuracion", configuracionRouter);
apiRouter.use("/mercadopago", mercadopagoRouter);
apiRouter.use("/pedidos", pedidosRouter);

// Solo staff (admin/vendedor)
apiRouter.use("/productos", requiereAuth, productosRouter);
apiRouter.use("/sucursales", requiereAuth, sucursalesRouter);
