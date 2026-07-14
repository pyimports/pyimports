import type { PaymentProvider } from "./types";
import { stubPaymentProvider } from "./stub-provider";
import { picpayProvider } from "./picpay-provider";

// Fábrica do provider de pagamento ativo. Enquanto PICPAY_TOKEN não estiver
// preenchido (dono da loja ainda não mandou as credenciais), cai no stub
// automaticamente — nada mais no app precisa mudar quando a chave real
// chegar, só preencher o .env.
export function getPaymentProvider(): PaymentProvider {
  return process.env.PICPAY_TOKEN ? picpayProvider : stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
