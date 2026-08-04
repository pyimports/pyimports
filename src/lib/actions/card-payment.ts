"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { getZendryAccessToken, ZENDRY_API_BASE } from "@/lib/payments/zendry-provider";
import { computeCardTotalForInstallments, MAX_CARD_INSTALLMENTS } from "@/lib/pricing";
import { digitsOnly } from "@/lib/cpf";

// Pagamento por cartão via Zendry (POST /v1/card_payments) — diferente do
// Pix (gerado automaticamente na criação do pedido), o cartão só acontece
// quando o cliente escolhe essa aba e preenche o formulário na tela de
// pagamento. Chamado direto do nosso servidor com o Bearer secreto — os
// dados do cartão NUNCA devem ser logados, impressos em erro, nem salvos em
// nenhuma coluna/metadata (só os campos seguros da resposta: últimos
// dígitos, bandeira, código de autorização).
//
// 3DS é obrigatório (confirmado testando de verdade: sem threeds_data a API
// sempre recusa com "Threeds data is required") — o desafio roda no
// navegador (ZendrySDKThreeds.init_threeds, ver PagamentoClient.tsx) e o
// resultado (three_ds_data) chega pronto aqui, só repassado pra API.

export interface CardPaymentThreedsData {
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

export interface CardPaymentInput {
  orderId: string;
  cardNumber: string;
  cardExpirationDate: string; // "MMyyyy"
  cardSecurityCode: string;
  cardHolderName: string;
  cardHolderDocument: string;
  installments: number;
  threedsData: CardPaymentThreedsData;
}

interface ZendryCardPaymentResponse {
  card_payment: {
    muid: string;
    status: "accepted" | "reject" | "waiting_3ds_authentication" | string;
    transaction_status?: string;
    last_digits?: string;
    brand?: string;
    authorization_code?: string;
  };
}

function validate(input: CardPaymentInput): string | null {
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

export async function payWithCard(
  input: CardPaymentInput
): Promise<{ error: string } | { ok: true }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const service = createServiceClient();

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, total, payment_status")
    .eq("id", input.orderId)
    .single();

  if (orderError || !order) return { error: "Pedido não encontrado." };
  if (order.payment_status === "confirmed") return { ok: true }; // já pago — idempotente

  // Valor real cobrado no cartão — Pix + taxa da bandeira pro número de
  // parcelas escolhido (tabela em src/lib/pricing.ts). Nunca confia num total
  // vindo do cliente; sempre recalcula aqui a partir do pedido.
  const cardTotal = computeCardTotalForInstallments(Number(order.total), input.installments);

  let token: string;
  try {
    token = await getZendryAccessToken();
  } catch {
    return { error: "Erro ao conectar com o gateway de pagamento. Tente novamente em instantes." };
  }

  let res: Response;
  try {
    res = await fetch(`${ZENDRY_API_BASE}/v1/card_payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        card_payment: {
          external_id: input.orderId,
          amount: Math.round(cardTotal * 100),
          currency: "BRL",
          payment_type: "CREDIT",
          card_number: digitsOnly(input.cardNumber),
          card_expiration_date: input.cardExpirationDate,
          card_security_code: input.cardSecurityCode,
          card_holder_name: input.cardHolderName.trim(),
          card_holder_document: digitsOnly(input.cardHolderDocument),
          installments: input.installments,
          threeds_data: input.threedsData,
        },
      }),
    });
  } catch {
    // Nunca inclui o corpo da requisição (tem dados do cartão) em erro nenhum.
    return { error: "Erro de conexão com o gateway de pagamento. Tente novamente." };
  }

  if (!res.ok) {
    let message = "Pagamento recusado pela operadora do cartão.";
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // corpo não veio como JSON — mantém a mensagem genérica
    }
    return { error: message };
  }

  const { card_payment: payment } = (await res.json()) as ZendryCardPaymentResponse;

  await service
    .from("payments")
    .update({ method: "card", external_id: payment.muid })
    .eq("order_id", input.orderId);

  if (payment.status === "waiting_3ds_authentication") {
    return {
      error:
        "Esse cartão exige uma etapa extra de segurança que ainda não oferecemos. Tente outro cartão ou pague com Pix.",
    };
  }

  if (payment.status !== "accepted") {
    return { error: "Pagamento recusado pela operadora do cartão." };
  }

  const result = await processPaymentResult({
    service,
    orderId: input.orderId,
    status: "approved",
    paidAt: new Date().toISOString(),
  });

  if (result.error) return { error: result.error };
  return { ok: true };
}
