"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { checkAndRecordLookupAttempt } from "@/lib/order-lookup-rate-limit";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import { hasFullName } from "@/lib/name";
import { transitionOrderStatus } from "@/lib/orders/transition";

// Primeira Server Action pública de ESCRITA do projeto (todas as outras
// exigem admin logado ou são só leitura). Segurança em duas camadas: rate
// limit por IP (mesmo mecanismo de order-lookup.ts) + exige o CPF do
// cliente batendo com o pedido — o mesmo "segredo" já usado pra encontrar o
// pedido em Acompanhar Pedido, não só o número do pedido (adivinhável).

const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
const NOT_FOUND_MESSAGE = "Não encontramos esse pedido com o CPF informado.";
const INVALID_STATUS_MESSAGE = "Esse pedido não está aguardando confirmação do frete no momento.";

export async function confirmShippingPayment(
  orderNumber: string,
  cpfRaw: string,
  fullName: string,
  shopeeOrderId: string
): Promise<{ error: string } | { ok: true }> {
  const { allowed } = await checkAndRecordLookupAttempt();
  if (!allowed) return { error: RATE_LIMIT_MESSAGE };

  if (!isValidCpf(cpfRaw)) return { error: "Informe um CPF válido." };

  const name = fullName.trim();
  const shopeeId = shopeeOrderId.trim();
  if (name.length < 3) return { error: "Informe o nome completo." };
  if (!hasFullName(name)) return { error: "Coloque nome e sobrenome." };
  if (!shopeeId) return { error: "Informe o ID do pedido na Shopee." };
  if (shopeeId.length > 14) return { error: "O ID do pedido tem no máximo 14 caracteres." };

  const service = createServiceClient();
  const cpfDigits = digitsOnly(cpfRaw);

  const { data: customers } = await service
    .from("customers")
    .select("id")
    .eq("cpf_cnpj", cpfDigits);

  const customerIds = new Set((customers ?? []).map((c) => c.id));
  if (customerIds.size === 0) return { error: NOT_FOUND_MESSAGE };

  const { data: order } = await service
    .from("orders")
    .select("id, status, customer_id, shipping_edit_authorized_at")
    .eq("order_number", orderNumber.trim())
    .maybeSingle();

  if (!order || !order.customer_id || !customerIds.has(order.customer_id)) {
    return { error: NOT_FOUND_MESSAGE };
  }

  // Primeiro envio (fluxo normal) OU correção de dados já enviados, mas só
  // se o admin já autorizou explicitamente — ver requestShippingEditAuthorization.
  const isFirstSubmission = order.status === "shipping_link_pending";
  const isAuthorizedCorrection = !!order.shipping_edit_authorized_at;
  if (!isFirstSubmission && !isAuthorizedCorrection) {
    return { error: INVALID_STATUS_MESSAGE };
  }

  // Correção não muda o status do pedido (já pode estar em shipping_paid,
  // label_issued ou até completed) — só corrige os dois campos e consome a
  // autorização de uma vez só.
  const { error: updateError } = await service
    .from("orders")
    .update({
      shipping_customer_name:      name,
      shipping_order_id:           shopeeId,
      shipping_edit_requested_at:  null,
      shipping_edit_authorized_at: null,
    })
    .eq("id", order.id);
  if (updateError) return { error: "Erro ao salvar os dados. Tente novamente." };

  if (isFirstSubmission) {
    const { error: transitionError } = await transitionOrderStatus(
      service,
      order.id,
      "shipping_paid",
      "cliente",
      "Cliente confirmou pagamento do frete"
    );
    if (transitionError) return { error: transitionError };
  }

  return { ok: true };
}

const EDIT_NOT_ALLOWED_MESSAGE = "Não é possível solicitar edição para esse pedido no momento.";

// Cliente pede pra corrigir nome/ID que já enviou (errou digitando, por
// exemplo). Não edita nada sozinho — só registra o pedido pro admin ver e
// autorizar manualmente (ver authorizeShippingEdit em lib/actions/orders.ts).
export async function requestShippingEditAuthorization(
  orderNumber: string,
  cpfRaw: string
): Promise<{ error: string } | { ok: true }> {
  const { allowed } = await checkAndRecordLookupAttempt();
  if (!allowed) return { error: RATE_LIMIT_MESSAGE };

  if (!isValidCpf(cpfRaw)) return { error: "Informe um CPF válido." };

  const service = createServiceClient();
  const cpfDigits = digitsOnly(cpfRaw);

  const { data: customers } = await service
    .from("customers")
    .select("id")
    .eq("cpf_cnpj", cpfDigits);

  const customerIds = new Set((customers ?? []).map((c) => c.id));
  if (customerIds.size === 0) return { error: NOT_FOUND_MESSAGE };

  const { data: order } = await service
    .from("orders")
    .select("id, customer_id, shipping_customer_name")
    .eq("order_number", orderNumber.trim())
    .maybeSingle();

  if (!order || !order.customer_id || !customerIds.has(order.customer_id)) {
    return { error: NOT_FOUND_MESSAGE };
  }

  // Só faz sentido pedir correção de algo que já foi enviado uma vez.
  if (!order.shipping_customer_name) return { error: EDIT_NOT_ALLOWED_MESSAGE };

  const { error: updateError } = await service
    .from("orders")
    .update({ shipping_edit_requested_at: new Date().toISOString() })
    .eq("id", order.id);
  if (updateError) return { error: "Erro ao registrar a solicitação. Tente novamente." };

  return { ok: true };
}

const INVALID_LABEL_STATUS_MESSAGE = "Esse pedido não está aguardando confirmação da etiqueta no momento.";

// Segunda Server Action pública de escrita — mesmo padrão de segurança da
// anterior (rate limit + CPF batendo com o pedido). O cliente confirma que
// viu a etiqueta e está tudo certo; se ele nunca confirmar, o pedido avança
// sozinho pra "completed" depois de 30min (ver maybeAutoCompleteOrder).
export async function confirmLabelReceived(
  orderNumber: string,
  cpfRaw: string
): Promise<{ error: string } | { ok: true }> {
  const { allowed } = await checkAndRecordLookupAttempt();
  if (!allowed) return { error: RATE_LIMIT_MESSAGE };

  if (!isValidCpf(cpfRaw)) return { error: "Informe um CPF válido." };

  const service = createServiceClient();
  const cpfDigits = digitsOnly(cpfRaw);

  const { data: customers } = await service
    .from("customers")
    .select("id")
    .eq("cpf_cnpj", cpfDigits);

  const customerIds = new Set((customers ?? []).map((c) => c.id));
  if (customerIds.size === 0) return { error: NOT_FOUND_MESSAGE };

  const { data: order } = await service
    .from("orders")
    .select("id, status, customer_id")
    .eq("order_number", orderNumber.trim())
    .maybeSingle();

  if (!order || !order.customer_id || !customerIds.has(order.customer_id)) {
    return { error: NOT_FOUND_MESSAGE };
  }

  if (order.status !== "label_issued") {
    return { error: INVALID_LABEL_STATUS_MESSAGE };
  }

  const { error: transitionError } = await transitionOrderStatus(
    service,
    order.id,
    "completed",
    "cliente",
    "Cliente confirmou que a etiqueta está correta"
  );
  if (transitionError) return { error: transitionError };

  return { ok: true };
}
