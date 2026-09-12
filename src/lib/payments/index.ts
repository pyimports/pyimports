import type { PaymentProvider } from "./types";
import { stubPaymentProvider } from "./stub-provider";
import { picpayProvider } from "./picpay-provider";
import { suprapayProvider } from "./suprapay-provider";
import { manualPaymentProvider } from "./manual-provider";
import { PAYMENT_MODE } from "./mode";

// Fábrica do provider de pagamento ativo. Enquanto PAYMENT_MODE === "manual"
// (ver ./mode.ts), o manualPaymentProvider tem prioridade sobre tudo.
//
// SupraPay é o provider ativo (2026-09-12) — só Pix. A Zendry foi removida
// de vez (não é mais rollback); PicPay continua como único fallback legado.
export function getPaymentProvider(): PaymentProvider {
  if (PAYMENT_MODE === "manual") return manualPaymentProvider;
  if (process.env.SUPRAPAY_API_KEY) return suprapayProvider;
  if (process.env.PICPAY_TOKEN) return picpayProvider;
  return stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
