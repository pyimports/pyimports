import type {
  PaymentProvider,
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentVerificationResult,
} from "./types";

// Provider de desenvolvimento — usado sempre que nenhum gateway real está
// configurado (ver getPaymentProvider em ./index.ts). Não fala com nenhuma
// API externa: gera um external_id determinístico e um código Pix de mentira,
// no mesmo formato que o checkout já usava antes de existir essa camada.
// A confirmação real (em dev) acontece via POST /api/payments/dev-confirm,
// que simula o que um webhook de gateway real enviaria.

const FAKE_PIX_PREFIX =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000053039865406";

function buildFakePixCode(total: number): string {
  const amount = total.toFixed(2);
  return `${FAKE_PIX_PREFIX}${amount}5802BR5916Loja6008Sao Paulo62070503***6304`;
}

export const stubPaymentProvider: PaymentProvider = {
  name: "stub",

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    return {
      checkoutUrl: `/pagamento/${input.orderId}`,
      externalId: `stub_${input.orderId}`,
      pixCode: buildFakePixCode(input.total),
    };
  },

  async verifyPayment(): Promise<PaymentVerificationResult> {
    // O stub nunca "sabe" que o pagamento foi aprovado por conta própria —
    // isso só acontece via dev-confirm, que chama processPaymentResult direto.
    return { status: "pending" };
  },
};
