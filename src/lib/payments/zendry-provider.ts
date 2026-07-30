import type {
  PaymentProvider,
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentVerificationResult,
  PaymentVerificationStatus,
} from "./types";

// Provider real — Zendry (https://developers.zendry.com), checkout hospedado
// (Pix + Cartão numa página do próprio Zendry — o número do cartão nunca
// passa pelo nosso servidor). Só entra em uso quando ZENDRY_CLIENT_ID e
// ZENDRY_CLIENT_SECRET estão preenchidos (ver getPaymentProvider em
// ./index.ts).
//
// IMPORTANTE: a documentação pública (developers.zendry.com) descreve a
// resposta de POST /v1/charges como `{ data: { charge: { reference_code,
// link, ... } } }`, mas testei contra a API real e o formato de verdade é
// `{ checkout: { reference_code, payment_link, ... } }`. O código abaixo
// segue o que a API realmente retorna, não a documentação.

const ZENDRY_API_BASE = "https://api.zendry.com.br";
const CHARGE_EXPIRATION_MINUTES = 30;

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.ZENDRY_CLIENT_ID;
  const clientSecret = process.env.ZENDRY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ZENDRY_CLIENT_ID / ZENDRY_CLIENT_SECRET não configurados.");
  }
  return { clientId, clientSecret };
}

function getWebhookSecret(): string {
  const secret = process.env.ZENDRY_WEBHOOK_SECRET;
  if (!secret) throw new Error("ZENDRY_WEBHOOK_SECRET não configurado.");
  return secret;
}

// Cache do token em memória — válido por 30min (expires_in: 1800), renovado
// com 60s de folga. Em ambiente serverless isso só ajuda enquanto a instância
// ficar "quente" entre requisições; cold start sempre paga uma chamada extra.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${ZENDRY_API_BASE}/auth/generate_token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Zendry recusou a geração do token (${res.status}): ${errorBody}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

// A doc do Zendry não documenta os valores exatos de `status` pro webhook de
// checkout (diferente dos webhooks de pix_qrcode/card_payment, que têm
// valores conhecidos) — mapeamento por substring, case-insensitive, tolerante
// a variações que a API possa usar.
export function mapZendryStatus(rawStatus: string | undefined | null): PaymentVerificationStatus {
  const s = (rawStatus ?? "").toLowerCase();
  if (/paid|complet|confirm|approv|success/.test(s)) return "approved";
  if (/cancel|expir|refund|chargeback/.test(s)) return "cancelled";
  if (/reject|fail|denied|declin|refus/.test(s)) return "rejected";
  return "pending";
}

interface ZendryChargeResponse {
  checkout: {
    reference_code: string;
    payment_link: string;
  };
}

export const zendryProvider: PaymentProvider = {
  name: "zendry",

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não configurado — necessário para o callback do Zendry.");

    const token = await getAccessToken();
    const expirationDate = new Date(Date.now() + CHARGE_EXPIRATION_MINUTES * 60 * 1000).toISOString();

    const res = await fetch(`${ZENDRY_API_BASE}/v1/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        charge: {
          value_cents: Math.round(input.total * 100),
          description: `Pedido #${input.orderNumber}`,
          callback_url: `${appUrl}/api/payments/webhook/zendry?key=${getWebhookSecret()}`,
          expiration_date: expirationDate,
          payment_methods: ["pix", "card"],
          platform_name: "PYimports",
          return_url: `${appUrl}/pagamento/${input.orderId}`,
          ...(input.customerDocument ? { generator_document: input.customerDocument } : {}),
          ...(input.customerName ? { generator_name: input.customerName } : {}),
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Zendry recusou a criação da cobrança (${res.status}): ${errorBody}`);
    }

    const { checkout } = (await res.json()) as ZendryChargeResponse;

    return {
      checkoutUrl: `/pagamento/${input.orderId}`,
      externalId: checkout.reference_code,
      externalCheckoutUrl: checkout.payment_link,
      // Sem pixCode/pixQrBase64 de propósito — o checkout hospedado do
      // Zendry mostra Pix e Cartão na própria página dele; não geramos QR
      // aqui. create-preference.ts já lida bem com esses campos ausentes.
    };
  },

  // Não há endpoint de consulta de status confirmado para o checkout
  // hospedado (testei GET /v1/charges/{reference_code} e variações contra a
  // API real — nenhuma respondeu de forma utilizável). A confirmação de
  // pagamento do Zendry depende inteiramente do webhook dedicado
  // (src/app/api/payments/webhook/zendry/route.ts), que confia no payload
  // protegido por um segredo próprio na URL de callback — não neste método.
  async verifyPayment(): Promise<PaymentVerificationResult> {
    throw new Error(
      "Zendry: não há verificação de status independente para o checkout hospedado — a confirmação chega só pelo webhook dedicado."
    );
  },
};
