import type { PaymentProvider } from "./types";
import { stubPaymentProvider } from "./stub-provider";
import { picpayProvider } from "./picpay-provider";
import { zendryProvider } from "./zendry-provider";

// Fábrica do provider de pagamento ativo. Zendry é o provider atual — entra
// em uso assim que ZENDRY_CLIENT_ID/ZENDRY_CLIENT_SECRET estiverem
// preenchidos. O PicPay não foi removido do projeto (fica como caminho de
// rollback): se por algum motivo precisar voltar atrás, basta preencher só
// PICPAY_TOKEN e deixar as variáveis do Zendry em branco. Sem nenhum dos
// dois configurado, cai no stub automaticamente.
export function getPaymentProvider(): PaymentProvider {
  if (process.env.ZENDRY_CLIENT_ID && process.env.ZENDRY_CLIENT_SECRET) return zendryProvider;
  if (process.env.PICPAY_TOKEN) return picpayProvider;
  return stubPaymentProvider;
}

export function isStubPaymentProvider(): boolean {
  return getPaymentProvider().name === "stub";
}

export type { PaymentProvider } from "./types";
