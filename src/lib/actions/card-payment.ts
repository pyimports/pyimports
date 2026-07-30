"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { getZendryAccessToken, ZENDRY_API_BASE } from "@/lib/payments/zendry-provider";
import { digitsOnly } from "@/lib/cpf";

// Pagamento por cartão via Zendry (POST /v1/card_payments) — diferente do
// Pix (gerado automaticamente na criação do pedido), o cartão só acontece
// quando o cliente escolhe essa aba e preenche o formulário na tela de
// pagamento. Chamado direto do nosso servidor com o Bearer secreto — os
// dados do cartão NUNCA devem ser logados, impressos em erro, nem salvos em
// nenhuma coluna/metadata (só os campos seguros da resposta: últimos
// dígitos, bandeira, código de autorização).
//
// SEM 3DS por enquanto (decisão consciente, ver plano) — cartões que o banco
// exigir autenticação adicional (status "waiting_3ds_authentication") vão
// falhar com uma mensagem clara, até o SDK de 3DS ser implementado.

export interface CardPaymentInput {
  orderId: string;
  cardNumber: string;
  cardExpirationDate: string; // "MMyyyy"
  cardSecurityCode: string;
  cardHolderName: string;
  cardHolderDocument: string;
  installments: number;
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
  if (input.installments < 1 || input.installments > 12) return "Número de parcelas inválido.";
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
          amount: Math.round(Number(order.total) * 100),
          currency: "BRL",
          payment_type: "CREDIT",
          card_number: digitsOnly(input.cardNumber),
          card_expiration_date: input.cardExpirationDate,
          card_security_code: input.cardSecurityCode,
          card_holder_name: input.cardHolderName.trim(),
          card_holder_document: digitsOnly(input.cardHolderDocument),
          installments: input.installments,
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
