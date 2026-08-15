"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { pyxgateFetch, type PyxgatePaymentResponse } from "@/lib/payments/pyxgate-provider";
import { computeCardTotalForInstallments, MAX_CARD_INSTALLMENTS } from "@/lib/pricing";
import { digitsOnly } from "@/lib/cpf";

// Pagamento por cartão via PYX Gate — POST /v1/payments com
// payment_method: "card" (endpoint único, diferente da Zendry que tinha uma
// rota separada pra cartão). PCI: número/validade/CVV trafegam direto no
// corpo desta requisição, feita pelo nosso servidor (confirmado na doc:
// "número, validade e CVV trafegam direto no corpo da sua requisição para
// POST /v1/payments") — mesmo modelo adquirente direto da integração
// anterior, mesmo escopo PCI-DSS SAQ D.
//
// 3DS continua obrigatório (a doc documenta "threeds_data obrigatório
// quando payment_method é 'card'"), rodando via SDK da Zendry no navegador
// (ver src/app/api/payments/pyxgate-3ds-token/route.ts) — o resultado chega
// pronto aqui, só repassado pra API.

export interface PyxgateCardPaymentThreedsData {
  operation_session_id: string;
  cavv: string;
  xid: string;
  eci: string;
  secure_version: string;
  directory_server_transaction_id: string;
  three_ds_server_transaction_id: string;
  ip_address: string;
  user_agent_browser_value: string;
  http_browser_language: string;
  http_browser_screen_height: string;
  http_browser_screen_width: string;
  zip_code: string;
}

export interface PyxgateCardPaymentInput {
  orderId: string;
  cardNumber: string;
  cardExpirationDate: string; // "MMyyyy"
  cardSecurityCode: string;
  cardHolderName: string;
  cardHolderDocument: string;
  customerEmail: string;
  installments: number;
  threedsData: PyxgateCardPaymentThreedsData;
}

function validate(input: PyxgateCardPaymentInput): string | null {
  const cardNumber = digitsOnly(input.cardNumber);
  if (cardNumber.length < 13 || cardNumber.length > 19) return "Número do cartão inválido.";
  if (!/^\d{6}$/.test(input.cardExpirationDate)) return "Validade do cartão inválida.";
  if (!/^\d{3,4}$/.test(input.cardSecurityCode)) return "Código de segurança (CVV) inválido.";
  if (!input.cardHolderName.trim()) return "Nome impresso no cartão é obrigatório.";
  if (!digitsOnly(input.cardHolderDocument)) return "CPF do titular do cartão é obrigatório.";
  if (input.installments < 1 || input.installments > MAX_CARD_INSTALLMENTS) return "Número de parcelas inválido.";
  if (!input.threedsData?.operation_session_id) return "Autenticação de segurança do cartão (3DS) não foi concluída.";
  return null;
}

export async function payWithCardPyxgate(
  input: PyxgateCardPaymentInput
): Promise<{ error: string } | { ok: true }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const service = createServiceClient();

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, total, payment_status, customer_name")
    .eq("id", input.orderId)
    .single();

  if (orderError || !order) return { error: "Pedido não encontrado." };
  if (order.payment_status === "confirmed") return { ok: true }; // já pago — idempotente

  // Valor real cobrado no cartão — Pix + taxa da parcela escolhida. Nunca
  // confia num total vindo do cliente; sempre recalcula a partir do pedido.
  const cardTotal = computeCardTotalForInstallments(Number(order.total), input.installments);

  let payment: PyxgatePaymentResponse;
  try {
    payment = await pyxgateFetch<PyxgatePaymentResponse>("/payments", {
      method: "POST",
      // Idempotency-Key própria do cartão (diferente da do Pix) — evita
      // cobrança duplicada se o cliente clicar "Pagar" mais de uma vez.
      idempotencyKey: `card_${input.orderId}`,
      body: {
        amount: Math.round(cardTotal * 100),
        payment_method: "card",
        customer: {
          name: order.customer_name,
          email: input.customerEmail,
          document: digitsOnly(input.cardHolderDocument),
        },
        card: {
          number: digitsOnly(input.cardNumber),
          holder_name: input.cardHolderName.trim(),
          expiration_date: input.cardExpirationDate,
          security_code: input.cardSecurityCode,
          installments: input.installments,
        },
        threeds_data: input.threedsData,
        metadata: { order_id: input.orderId },
      },
    });
  } catch (err) {
    // Nunca inclui o corpo da requisição (tem dados do cartão) no erro.
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Threeds data")) {
      return { error: "Autenticação de segurança do cartão (3DS) falhou. Tente novamente." };
    }
    return { error: "Erro de conexão com o gateway de pagamento. Tente novamente." };
  }

  await service
    .from("payments")
    .update({ method: "card", external_id: payment.id })
    .eq("order_id", input.orderId);

  if (payment.status !== "paid") {
    return { error: "Pagamento recusado pela operadora do cartão." };
  }

  const result = await processPaymentResult({
    service,
    orderId: input.orderId,
    status: "approved",
    paidAt: new Date(payment.created * 1000).toISOString(),
  });

  if (result.error) return { error: result.error };
  return { ok: true };
}
