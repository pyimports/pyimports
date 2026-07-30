import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { mapZendryStatus } from "@/lib/payments/zendry-provider";
import type { Json } from "@/types/database.types";

// POST /api/payments/webhook/zendry — endpoint dedicado ao checkout
// hospedado do Zendry. Diferente do webhook do PicPay (que nunca confia no
// payload e sempre revalida via provider.verifyPayment), este confia
// diretamente no payload — porque a doc do Zendry não documenta assinatura
// nem valores de status pro webhook desse produto ("checkout"). Em troca, a
// autenticidade vem da própria URL de callback: ela é gerada por nós com uma
// chave secreta como query param (?key=...), conhecida só por nós e pela
// chamada que o Zendry faz — nunca aparece no return_url (esse sim visível
// no navegador do cliente).
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

  const message =
    payload.notification_type === "checkout"
      ? (payload.message as Record<string, unknown> | undefined)
      : undefined;

  const externalId = (message?.reference_code as string | undefined) ?? undefined;
  if (!externalId) {
    return NextResponse.json({ ok: true });
  }

  const rawStatus = message?.status as string | undefined;
  const status = mapZendryStatus(rawStatus);
  const paidAt = message?.payment_date as string | undefined;

  // action entra na constraint única (external_id, action) junto com type —
  // usa o status já mapeado, não o texto cru, pra retentativas do mesmo
  // evento colidirem, mas uma mudança real de status conte como novo evento.
  const action = `checkout.${status}`;

  const { error: insertError } = await service.from("payment_webhooks").insert({
    external_id: externalId,
    type: "zendry_checkout",
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
