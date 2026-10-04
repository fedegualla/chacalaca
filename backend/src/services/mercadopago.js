import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";
import QRCode from "qrcode";

const accessToken = process.env.MP_ACCESS_TOKEN;

const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;

function requiereCliente() {
  if (!client) {
    throw new Error(
      "MP_ACCESS_TOKEN no está configurado. Completá backend/.env para cobrar con Mercado Pago."
    );
  }
  return client;
}

// Crea el link de cobro para una venta puntual. external_reference = id de la
// venta, así el webhook sabe a qué venta corresponde el pago que llegue.
export async function crearPreferenciaPago({ ventaId, total, descripcion }) {
  const preference = new Preference(requiereCliente());
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  const notificationUrl = base ? `${base}/api/mercadopago/webhook` : undefined;

  const { body } = await preference.create({
    body: {
      items: [
        {
          title: descripcion || `Venta #${ventaId}`,
          quantity: 1,
          unit_price: Number(total),
          currency_id: "ARS"
        }
      ],
      external_reference: String(ventaId),
      notification_url: notificationUrl,
      back_urls: base
        ? {
            success: `${base}/api/mercadopago/volver/${ventaId}`,
            pending: `${base}/api/mercadopago/volver/${ventaId}`,
            failure: `${base}/api/mercadopago/volver/${ventaId}`
          }
        : undefined
    }
  });

  return {
    preferenceId: body.id,
    initPoint: body.init_point || body.sandbox_init_point
  };
}

// Genera el QR (como data URL PNG) que el cliente escanea desde la app de
// Mercado Pago para pagar el link de cobro.
export async function generarQrDataUrl(url) {
  return QRCode.toDataURL(url, { margin: 1, width: 280 });
}

// Trae el estado real de un pago desde la API de Mercado Pago (nunca confiamos
// en lo que diga el webhook sin volver a consultar).
export async function consultarPago(paymentId) {
  const payment = new Payment(requiereCliente());
  const { body } = await payment.get({ id: paymentId });
  return body;
}

// Busca el pago más reciente asociado a una preferencia/venta, usado por el
// botón "verificar pago" del POS para no depender solo del webhook.
export async function buscarUltimoPagoPorReferencia(externalReference) {
  const payment = new Payment(requiereCliente());
  const { results } = await payment.search({
    options: { criteria: "desc", sort: "date_created" },
    qs: { external_reference: externalReference }
  });
  return results?.[0] || null;
}

// Valida la firma x-signature que manda Mercado Pago en cada webhook.
// Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
export function validarFirmaWebhook({ xSignature, xRequestId, dataId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado (ej. dev local), no se valida

  if (!xSignature || !xRequestId || !dataId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => p.trim().split("=").map((s) => s.trim()))
  );
  const ts = partes.ts;
  const hashRecibido = partes.v1;
  if (!ts || !hashRecibido) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hashEsperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const bufEsperado = Buffer.from(hashEsperado);
  const bufRecibido = Buffer.from(hashRecibido);
  if (bufEsperado.length !== bufRecibido.length) return false;

  return crypto.timingSafeEqual(bufEsperado, bufRecibido);
}
