import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { processPaymentResult } from "@/lib/payments/process";
import type { Json } from "@/types/database.types";

// POST /api/payments/webhook/suprapay
//
// Assinatura documentada pela SupraPay:
//   Headers: X-Supra-Webhook-Timestamp, X-Supra-Webhook-Signature
//   signature = HMAC-SHA256(SUPRAPAY_WEBHOOK_SECRET, `${timestamp}\n${rawBody}`)
//
// IMPORTANTE: a assinatura é calculada sobre o corpo CRU — por isso lemos
// como texto (request.text()) e só damos JSON.parse DEPOIS de validar.
function verifySignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string): boolean {
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}\n${rawBody}`).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type SuprapayWebhookEvent = {
  id: string;
  event: "pix.charge.created" | "pix.charge.paid" | "pix.charge.expired" | "pix.charge.cancelled" | string;
  created_at: string;
  data: { txid: string; amount: number; external_reference?: string };
};

function statusFromEvent(event: string): "approved" | "cancelled" | null {
  if (event === "pix.charge.paid") return "approved";
  if (event === "pix.charge.expired" || event === "pix.charge.cancelled") return "cancelled";
  return null; // pix.charge.created — nada a processar, só confirma recebimento
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPRAPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("X-Supra-Webhook-Timestamp");
  const signature = request.headers.get("X-Supra-Webhook-Signature");

  if (!verifySignature(rawBody, timestamp, signature, secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let event: SuprapayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const externalId = event.data?.txid;
  if (!externalId) {
    return NextResponse.json({ ok: true });
  }

  const status = statusFromEvent(event.event);
  const service = createServiceClient();

  // Idempotência: mesma constraint única (external_id, action) já usada
  // pelos outros webhooks — action inclui o id do evento pra retentativas
  // do mesmo evento colidirem sem depender só do status.
  const action = `${event.event}.${event.id}`;

  const { error: insertError } = await service.from("payment_webhooks").insert({
    external_id: externalId,
    type: "suprapay",
    action,
    raw_payload: event as unknown as Json,
  });

  if (insertError) {
    // 23505 = unique_violation — evento já processado antes, ignora.
    return NextResponse.json({ ok: true });
  }

  if (!status) {
    await service
      .from("payment_webhooks")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("external_id", externalId)
      .eq("action", action);
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
        paidAt: event.created_at,
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
