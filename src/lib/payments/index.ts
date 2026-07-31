import type { PaymentProvider } from "./types";
import { stubPaymentProvider } from "./stub-provider";
import { picpayProvider } from "./picpay-provider";
import { zendryProvider } from "./zendry-provider";
import { manualPaymentProvider } from "./manual-provider";
import { PAYMENT_MODE } from "./mode";

// Fábrica do provider de pagamento ativo. Enquanto PAYMENT_MODE === "manual"
// (ver ./mode.ts), o manualPaymentProvider tem prioridade sobre tudo — Zendry
// e PicPay ficam como caminho de rollback prontos pra quando PAYMENT_MODE
// voltar a "gateway": Zendry entra em uso assim que
// ZENDRY_CLIENT_ID/ZENDRY_CLIENT_SECRET estiverem preenchidos, PicPay se só
// PICPAY_TOKEN estiver preenchido. Sem nenhum dos dois configurado, cai no
// stub automaticamente.
export function getPaymentProvider(): PaymentProvider {
  if (PAYMENT_MODE === "manual") return manualPaymentProvider;
  if (process.env.ZENDRY_CLIENT_ID && process.env.ZENDRY_CLIENT_SECRET) return zendryProvider;
  if (process.env.PICPAY_TOKEN) return picpayProvider;
  return stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
