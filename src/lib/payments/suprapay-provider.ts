import { createHash, createHmac, randomUUID } from "crypto";
import type {
  PaymentProvider,
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentVerificationResult,
  PaymentVerificationStatus,
} from "./types";

// Provider SupraPay (https://app.suprapay.com.py — Merchant Integration Guide,
// PIX API v1.1.0) — só Pix, é tudo que essa conta contrata. Substitui a PYX
// Gate (que fazia Pix + cartão) — a loja parou de vender no cartão junto com
// essa troca, então não existe equivalente de cartão/3DS aqui.
//
// Autenticação é HMAC v2 (não Bearer simples como os providers anteriores): cada
// requisição assina 5 linhas — timestamp, nonce, method, path completo (com
// o prefixo /api/v1/integrations) e o hash SHA-256 do corpo — com
// HMAC-SHA256(SUPRAPAY_API_SECRET), hex, no header X-Supra-Signature.
export const SUPRAPAY_API_BASE = process.env.SUPRAPAY_BASE_URL || "https://app.suprapay.com.py/api/v1/integrations";
// Derivado da base configurada (em vez de fixo) — a assinatura HMAC precisa
// do path exatamente igual ao que a SupraPay recebe, prefixo incluído; se
// SUPRAPAY_BASE_URL mudar (ex: um dia existir sandbox com prefixo diferente),
// a assinatura acompanha sem precisar editar código.
const SUPRAPAY_PATH_PREFIX = new URL(SUPRAPAY_API_BASE).pathname;

function getCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.SUPRAPAY_API_KEY;
  const apiSecret = process.env.SUPRAPAY_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("SUPRAPAY_API_KEY/SUPRAPAY_API_SECRET não configuradas.");
  return { apiKey, apiSecret };
}

export async function suprapayFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }
): Promise<T> {
  const { apiKey, apiSecret } = getCredentials();

  const bodyStr = init.body ? JSON.stringify(init.body) : "";
  const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const fullPath = `${SUPRAPAY_PATH_PREFIX}${path}`;

  // Ordem e separador (\n) são exigidos pela doc — mudar isso quebra a
  // assinatura silenciosamente (a API só devolve 401 invalid_signature).
  const payload = [timestamp, nonce, init.method, fullPath, bodyHash].join("\n");
  const signature = createHmac("sha256", apiSecret).update(payload).digest("hex");

  const headers: Record<string, string> = {
    "X-Supra-Key": apiKey,
    "X-Supra-Timestamp": timestamp,
    "X-Supra-Nonce": nonce,
    "X-Supra-Signature": signature,
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${SUPRAPAY_API_BASE}${path}`, {
    method: init.method,
    headers,
    ...(init.body ? { body: bodyStr } : {}),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    // Log completo fica só no servidor — a mensagem que vira Error aqui pode
    // se propagar até o cliente (ver checkout.ts), então nunca deve ser JSON cru.
    console.error(`SupraPay ${init.method} ${path} falhou (${res.status}):`, errorBody);
    let message = "Erro ao processar pagamento. Tente novamente em instantes.";
    try {
      const parsed = JSON.parse(errorBody) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // corpo não veio como JSON — mantém a mensagem genérica
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function mapSuprapayStatus(status: string | undefined | null): PaymentVerificationStatus {
  switch (status) {
    case "paid": return "approved";
    case "failed": return "rejected";
    case "expired":
    case "cancelled": return "cancelled";
    default: return "pending"; // pending, processing
  }
}

export interface SuprapayCharge {
  txid: string;
  status: "pending" | "processing" | "paid" | "expired" | "cancelled" | "failed";
  amount_brl: number;
  qr_code?: string;
  qr_code_text?: string;
  qr_image_url?: string;
}

export interface SuprapayChargeStatus {
  txid: string;
  status: SuprapayCharge["status"];
  is_terminal: boolean;
  paid_at?: string;
}

export const suprapayProvider: PaymentProvider = {
  name: "suprapay",

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const res = await suprapayFetch<{ data: { charge: SuprapayCharge } }>("/pix/charges", {
      method: "POST",
      // orderId como Idempotency-Key: retry do mesmo pedido reaproveita a
      // cobrança já criada em vez de gerar uma segunda cobrança PIX.
      idempotencyKey: input.orderId,
      body: {
        amount: input.total,
        external_reference: input.orderId,
        custom_fields: {
          order_number: input.orderNumber,
          customer_name: input.customerName,
        },
      },
    });

    const charge = res.data.charge;

    return {
      checkoutUrl: `/pagamento/${input.orderId}`,
      externalId: charge.txid,
      pixCode: charge.qr_code_text ?? charge.qr_code,
    };
  },

  async verifyPayment(externalId: string): Promise<PaymentVerificationResult> {
    const res = await suprapayFetch<{ data: SuprapayChargeStatus }>(`/pix/charges/${externalId}/status`, {
      method: "GET",
    });
    return { status: mapSuprapayStatus(res.data.status), paidAt: res.data.paid_at };
  },
};
