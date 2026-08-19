import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSecret, parseZendryWebhook } from "@/lib/zendry/webhook";

// POST /api/webhooks/zendry?key=SEU_ZENDRY_WEBHOOK_SECRET
//
// Endpoint único pros três tipos de notificação usados no projeto de
// origem: "pix_qrcode" (Pix embutido), "card_payment" (confirmação
// assíncrona do cartão — a primeira confirmação já acontece na resposta
// síncrona de POST /api/payments/zendry/card) e "checkout" (produto legado,
// mantido só se você também usar o checkout hospedado da Zendry).
//
// Ao contrário do resto da camada de pagamentos, ESTA rota não segue o
// padrão "sempre responde 200 pra retentativa": uma chave inválida retorna
// 401 sem tocar no banco — não é um cenário de retentativa legítima.
//
// IMPORTANTE: registre esta URL completa (com ?key=...) como callback_url
// na conta Zendry ANTES de testar (ver ZENDRY-MIGRATION.md, seção
// Webhooks — não há endpoint no código que faça esse registro, é feito à
// parte, uma vez, fora do projeto).
export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!verifyWebhookSecret(key, process.env.ZENDRY_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = parseZendryWebhook(payload);
  if (!event) {
    return NextResponse.json({ ok: true });
  }

  // IDEMPOTÊNCIA: a Zendry pode reenviar o mesmo evento mais de uma vez
  // (retry). No projeto de origem isso é garantido por uma constraint única
  // (external_id, action) numa tabela `payment_webhooks` — INSERT que colide
  // com essa constraint = evento já processado, ignora. Ver DDL de
  // referência em ZENDRY-MIGRATION.md.
  const action = `${event.notificationType}.${event.status}`;

  // TODO: grave o evento de forma idempotente e processe só se for novo:
  //   const { error: insertError } = await db.paymentWebhooks.insert({
  //     external_id: event.externalId, type: `zendry_${event.notificationType}`,
  //     action, raw_payload: event.raw,
  //   });
  //   if (insertError?.code === "23505") return NextResponse.json({ ok: true }); // já processado
  //
  //   const payment = await db.payments.findByExternalId(event.externalId);
  //   if (payment && event.status === "approved") {
  //     await db.orders.markPaid(payment.orderId, { paidAt: event.paidAt });
  //   } else if (payment && (event.status === "rejected" || event.status === "cancelled")) {
  //     await db.orders.markPaymentFailed(payment.orderId);
  //   }
  void action; // remova quando ligar a persistência real

  return NextResponse.json({ ok: true });
}
