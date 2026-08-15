import type { PaymentProvider } from "./types";
import { stubPaymentProvider } from "./stub-provider";
import { picpayProvider } from "./picpay-provider";
import { zendryProvider } from "./zendry-provider";
import { pyxgateProvider } from "./pyxgate-provider";
import { manualPaymentProvider } from "./manual-provider";
import { PAYMENT_MODE } from "./mode";

// Fábrica do provider de pagamento ativo. Enquanto PAYMENT_MODE === "manual"
// (ver ./mode.ts), o manualPaymentProvider tem prioridade sobre tudo.
//
// PYX Gate é o provider ativo (2026-08-15) — trocado no lugar da Zendry
// depois de um pagamento Pix real confirmado do lado da Zendry cujo webhook
// nunca chegou no nosso servidor (causa raiz não identificada — Zendry e
// PicPay ficam como rollback, mesmo padrão de sempre).
export function getPaymentProvider(): PaymentProvider {
  if (PAYMENT_MODE === "manual") return manualPaymentProvider;
  if (process.env.PYXGATE_SECRET_KEY) return pyxgateProvider;
  if (process.env.ZENDRY_CLIENT_ID && process.env.ZENDRY_CLIENT_SECRET) return zendryProvider;
  if (process.env.PICPAY_TOKEN) return picpayProvider;
  return stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
