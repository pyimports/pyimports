import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { mapZendryStatus } from "@/lib/payments/zendry-provider";
import type { Json } from "@/types/database.types";

// POST /api/payments/webhook/zendry — endpoint único pros três tipos de
// notificação do Zendry que usamos: "pix_qrcode" (Pix embutido, principal),
// "card_payment" (segunda confirmação do cartão — a primeira já acontece
// direto na resposta síncrona de src/lib/actions/card-payment.ts) e
// "checkout" (produto antigo — checkout hospedado, mantido só pra não
// deixar órfão nenhum pedido antigo que ainda esteja com esse fluxo pendente).
//
// Diferente do webhook do PicPay (que nunca confia no payload e sempre
// revalida via provider.verifyPayment), este confia diretamente no payload
// — a doc do Zendry não documenta assinatura nem valores de status de forma
// confiável pra nenhum desses três tipos. A autenticidade vem da própria URL
// de callback: gerada por nós com uma chave secreta como query param
// (?key=...), conhecida só por nós e pela chamada que o Zendry faz — nunca
// aparece no return_url (esse sim visível no navegador do cliente).
//
// Por isso, ao contrário de todo o resto da camada de pagamentos, ESTA rota
// não segue o padrão "sempre responde 200": uma chave inválida retorna 401
// sem tocar no banco, já que isso não é um cenário de retentativa legítima
// do Zendry.
export async function POST(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.ZENDRY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = createServiceClient();

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const notificationType = payload.notification_type as string | undefined;
  const message = payload.message as Record<string, unknown> | undefined;

  if (!message || !notificationType) {
    return NextResponse.json({ ok: true });
  }

  // O campo que identifica o pagamento em payments.external_id varia por
  // tipo: Pix/checkout usam reference_code, cartão usa muid (é o que
  // card-payment.ts grava em external_id assim que a Zendry responde).
  const externalId =
    notificationType === "card_payment"
      ? (message.muid as string | undefined)
      : (message.reference_code as string | undefined);

  if (!externalId) {
    return NextResponse.json({ ok: true });
  }

  const rawStatus = message.status as string | undefined;
  const status = mapZendryStatus(rawStatus);
  const paidAt = (message.payment_date as string | undefined) ?? (message.created_at as string | undefined);

  // action entra na constraint única (external_id, action) junto com type —
  // usa o status já mapeado, não o texto cru, pra retentativas do mesmo
  // evento colidirem, mas uma mudança real de status conte como novo evento.
  const action = `${notificationType}.${status}`;

  const { error: insertError } = await service.from("payment_webhooks").insert({
    external_id: externalId,
    type: `zendry_${notificationType}`,
    action,
    raw_payload: payload as Json,
  });

  if (insertError) {
    // 23505 = unique_violation — evento já processado antes, ignora.
    return NextResponse.json({ ok: true });
  }

  try {
    const { data: payment } = await service
      .from("payments")
      .select("order_id")
      .eq("external_id", externalId)
      .single();

    if (payment) {
      const result = await processPaymentResult({
        service,
        orderId: payment.order_id,
        status,
        paidAt,
      });

      if (result.error) {
        await service
          .from("payment_webhooks")
          .update({ error: result.error })
          .eq("external_id", externalId)
          .eq("action", action);
      }
    }

    await service
      .from("payment_webhooks")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("external_id", externalId)
      .eq("action", action);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar webhook.";
    await service
      .from("payment_webhooks")
      .update({ error: message })
      .eq("external_id", externalId)
      .eq("action", action);
  }

  return NextResponse.json({ ok: true });
}
