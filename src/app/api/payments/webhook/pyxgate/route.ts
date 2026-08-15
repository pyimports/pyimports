import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import { mapPyxgateStatus } from "@/lib/payments/pyxgate-provider";
import type { Json } from "@/types/database.types";

// POST /api/payments/webhook/pyxgate
//
// Diferente do webhook da Zendry (que confiava só num segredo nosso na URL,
// porque a Zendry não documenta assinatura de forma confiável), este usa a
// assinatura HMAC-SHA256 de verdade que a PYX Gate documenta:
//
//   Header: PYX-Signature: t=<timestamp>,v1=<hmac>
//   hmac = HMAC-SHA256(PYXGATE_WEBHOOK_SECRET, `${timestamp}.${rawBody}`)
//
// IMPORTANTE: a assinatura é calculada sobre o corpo CRU da requisição —
// por isso lemos como texto (request.text()) e só damos JSON.parse DEPOIS de
// validar a assinatura. Reserializar o JSON antes de verificar quebraria a
// assinatura (ordem de chaves/espaçamento podem mudar).
function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const receivedHmac = parts.v1;
  if (!timestamp || !receivedHmac) return false;

  const expectedHmac = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  // timingSafeEqual exige buffers do mesmo tamanho — compara só se baterem,
  // senão já é falso (evita side-channel de tamanho, mas não é o vetor mais
  // provável aqui; o importante é nunca usar `===` puro numa comparação de
  // segredo).
  const a = Buffer.from(receivedHmac);
  const b = Buffer.from(expectedHmac);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface PyxgateWebhookEvent {
  id: string;
  type: "payment.created" | "payment.paid" | "payment.failed" | "payment.expired" | "refund.succeeded" | string;
  created: number;
  data: { object: { id: string; status: string; amount: number } };
}

export async function POST(request: NextRequest) {
  const secret = process.env.PYXGATE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("PYX-Signature");

  if (!verifySignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let event: PyxgateWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const externalId = event.data?.object?.id;
  const rawStatus = event.data?.object?.status;
  if (!externalId) {
    return NextResponse.json({ ok: true });
  }

  const status = mapPyxgateStatus(rawStatus);
  const service = createServiceClient();

  // Idempotência: mesma constraint única (external_id, action) já usada
  // pelo webhook da Zendry — action inclui o id do evento (event.id) pra
  // retentativas do mesmo evento colidirem sem depender só do status.
  const action = `${event.type}.${event.id}`;

  const { error: insertError } = await service.from("payment_webhooks").insert({
    external_id: externalId,
    type: "pyxgate",
    action,
    raw_payload: event as unknown as Json,
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
        paidAt: new Date(event.created * 1000).toISOString(),
      });

      if (result.error) {
        await service.from("payment_webhooks").update({ error: result.error }).eq("external_id", externalId).eq("action", action);
      }
    }

    await service
      .from("payment_webhooks")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("external_id", externalId)
      .eq("action", action);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar webhook.";
    await service.from("payment_webhooks").update({ error: message }).eq("external_id", externalId).eq("action", action);
  }

  return NextResponse.json({ ok: true });
}
