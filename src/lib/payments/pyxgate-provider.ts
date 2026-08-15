import type {
  PaymentProvider,
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentVerificationResult,
  PaymentVerificationStatus,
} from "./types";

// Provider PYX Gate (https://www.pyxgate.com/developers) — substitui a Zendry
// como gateway ativo. Diferente da Zendry: tem modo de teste de verdade
// (mesma URL, chaves sk_test_/sk_live_ que decidem o modo), endpoint único
// POST /v1/payments pra Pix e cartão (discriminado por payment_method),
// GET /v1/payments/{id} pra consultar status (a Zendry não tinha isso),
// webhook com assinatura HMAC-SHA256 de verdade, e refund via API.
//
// Cartão via PYX Gate ainda depende do SDK de 3DS da Zendry por baixo dos
// panos (a doc do PYX Gate documenta isso abertamente: "3DS só funciona com
// adquirente Zendry") — o token exposto no navegador pro desafio 3DS
// continua sendo um Bearer não escopado, mesmo risco que já foi aceito
// conscientemente na integração direta com a Zendry. Ver
// src/app/api/payments/pyxgate-3ds-token/route.ts.
export const PYXGATE_API_BASE = "https://pyxgate-api.onrender.com/v1";

function getSecretKey(): string {
  const key = process.env.PYXGATE_SECRET_KEY;
  if (!key) throw new Error("PYXGATE_SECRET_KEY não configurada.");
  return key;
}

export async function pyxgateFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; idempotencyKey?: string }
): Promise<T> {
  const key = getSecretKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  // Idempotency-Key evita cobrança duplicada em retry de rede — a Zendry não
  // tinha esse mecanismo, o PYX Gate tem (TTL de 24h documentado).
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${PYXGATE_API_BASE}${path}`, {
    method: init.method,
    headers,
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    // Log completo (com status/path/corpo cru) fica só no servidor — o que
    // vira Error aqui pode se propagar até uma mensagem mostrada pro
    // cliente (ver checkout.ts), então nunca deve ser JSON cru.
    console.error(`PYX Gate ${init.method} ${path} falhou (${res.status}):`, errorBody);
    let message = "Erro ao processar pagamento. Tente novamente em instantes.";
    try {
      const parsed = JSON.parse(errorBody) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // corpo não veio como JSON — mantém a mensagem genérica
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function mapPyxgateStatus(status: string | undefined | null): PaymentVerificationStatus {
  switch (status) {
    case "paid": return "approved";
    case "failed": return "rejected";
    case "refunded": return "cancelled";
    default: return "pending";
  }
}

export interface PyxgatePaymentResponse {
  id: string;
  object: "payment";
  amount: number;
  fee: number;
  net_amount: number;
  currency: "BRL";
  status: "pending" | "paid" | "failed" | "refunded";
  payment_method: "pix" | "card" | "boleto";
  mode: "test" | "live";
  qr_code?: string;
  qr_code_base64?: string;
  card?: { last4: string; brand: string; authorization_code: string };
  metadata?: Record<string, unknown>;
  created: number;
}

export const pyxgateProvider: PaymentProvider = {
  name: "pyxgate",

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    // customer.document é obrigatório na PYX Gate (diferente da Zendry, onde
    // era opcional) — se o CPF não foi coletado no checkout, falha aqui com
    // mensagem clara em vez de mandar string vazia pra API.
    if (!input.customerDocument) {
      throw new Error("CPF/CNPJ do cliente é obrigatório pra criar cobrança na PYX Gate.");
    }

    const payment = await pyxgateFetch<PyxgatePaymentResponse>("/payments", {
      method: "POST",
      idempotencyKey: input.orderId,
      body: {
        amount: Math.round(input.total * 100),
        payment_method: "pix",
        customer: {
          name: input.customerName,
          email: input.customerEmail,
          document: input.customerDocument,
        },
        metadata: { order_id: input.orderId, order_number: input.orderNumber },
      },
    });

    return {
      checkoutUrl: `/pagamento/${input.orderId}`,
      externalId: payment.id,
      pixCode: payment.qr_code,
      pixQrBase64: payment.qr_code_base64,
    };
  },

  // Diferente da Zendry, aqui existe consulta de status de verdade.
  async verifyPayment(externalId: string): Promise<PaymentVerificationResult> {
    const payment = await pyxgateFetch<PyxgatePaymentResponse>(`/payments/${externalId}`, { method: "GET" });
    return { status: mapPyxgateStatus(payment.status) };
  },
};
