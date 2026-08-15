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
// PYX Gate está implementado (pyxgate-provider.ts) mas AINDA NÃO é o
// provider ativo — só testado com chave sk_live_ até agora, sem chave de
// teste confirmada nem webhook registrado. Zendry continua no topo da
// prioridade de propósito, até o PYX Gate ser validado de ponta a ponta;
// depois disso, troque a ordem abaixo (pyxgate antes de zendry). Ambos
// ficam prontos como rollback um do outro, mesmo padrão usado com o PicPay.
export function getPaymentProvider(): PaymentProvider {
  if (PAYMENT_MODE === "manual") return manualPaymentProvider;
  if (process.env.ZENDRY_CLIENT_ID && process.env.ZENDRY_CLIENT_SECRET) return zendryProvider;
  if (process.env.PYXGATE_SECRET_KEY) return pyxgateProvider;
  if (process.env.PICPAY_TOKEN) return picpayProvider;
  return stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
