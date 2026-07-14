import type {
  PaymentProvider,
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentVerificationResult,
  PaymentVerificationStatus,
} from "./types";

// Provider real — PicPay Checkout (https://developers.picpay.com). Só entra
// em uso quando PICPAY_TOKEN está preenchido (ver getPaymentProvider em
// ./index.ts); até lá o stub responde por tudo. Token da loja em
// https://ecommerce.picpay.com > Vendas Online > Credenciais.

const PICPAY_API_BASE = "https://appws.picpay.com/ecommerce/public";

function getToken(): string {
  const token = process.env.PICPAY_TOKEN;
  if (!token) throw new Error("PICPAY_TOKEN não configurado.");
  return token;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" ") || parts[0] || fullName,
  };
}

// PicPay não usa os mesmos nomes de status do Mercado Pago — "paid" é a
// confirmação em si, "completed" vem depois (repasse liberado), então os
// dois já contam como aprovado pro nosso fluxo.
function mapStatus(picpayStatus: string): PaymentVerificationStatus {
  switch (picpayStatus) {
    case "paid":
    case "completed":
      return "approved";
    case "refunded":
    case "chargeback":
      return "cancelled";
    case "expired":
      return "rejected";
    default:
      // created, analysis
      return "pending";
  }
}

interface PicPayCreateResponse {
  referenceId: string;
  paymentUrl: string;
  qrcode?: { content?: string; base64?: string };
  expiresAt?: string;
}

interface PicPayStatusResponse {
  referenceId: string;
  status: string;
}

export const picpayProvider: PaymentProvider = {
  name: "picpay",

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const { firstName, lastName } = splitName(input.customerName);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const res = await fetch(`${PICPAY_API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-picpay-token": getToken(),
      },
      body: JSON.stringify({
        referenceId: input.orderId,
        value: input.total,
        ...(appUrl
          ? {
              callbackUrl: `${appUrl}/api/payments/webhook`,
              returnUrl: `${appUrl}/pagamento/${input.orderId}`,
            }
          : {}),
        buyer: {
          firstName,
          lastName,
          email: input.customerEmail,
          ...(input.customerPhone ? { phone: input.customerPhone } : {}),
          ...(input.customerDocument ? { document: input.customerDocument } : {}),
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`PicPay recusou a criação do pagamento (${res.status}): ${errorBody}`);
    }

    const payment = (await res.json()) as PicPayCreateResponse;
    // A doc do PicPay não deixa 100% claro se `qrcode.base64` já vem com o
    // prefixo "data:image/png;base64,". Normaliza pra garantir que o <img>
    // do front sempre receba uma data URL válida.
    const rawBase64 = payment.qrcode?.base64;
    const pixQrBase64 = rawBase64
      ? rawBase64.startsWith("data:")
        ? rawBase64.replace(/^data:image\/\w+;base64,/, "")
        : rawBase64
      : undefined;

    return {
      checkoutUrl: `/pagamento/${input.orderId}`,
      externalId: payment.referenceId,
      pixCode: payment.qrcode?.content,
      pixQrBase64,
      externalCheckoutUrl: payment.paymentUrl,
    };
  },

  async verifyPayment(externalId: string): Promise<PaymentVerificationResult> {
    const res = await fetch(`${PICPAY_API_BASE}/payments/${externalId}/status`, {
      headers: { "x-picpay-token": getToken() },
    });

    if (!res.ok) {
      throw new Error(`Erro ao consultar pagamento ${externalId} no PicPay (${res.status}).`);
    }

    const payment = (await res.json()) as PicPayStatusResponse;

    return { status: mapStatus(payment.status) };
  },
};
