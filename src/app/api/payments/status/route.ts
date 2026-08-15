import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { processPaymentResult } from "@/lib/payments/process";

// GET /api/payments/status?orderId=...
//
// Consultado por polling do lado do cliente (PagamentoClient.tsx) enquanto o
// cliente está na tela de pagamento — detecta confirmação sem depender só
// do webhook chegar (motivo: um pedido real ficou preso "pendente" porque o
// webhook da Zendry nunca chegou, mesmo o pagamento tendo sido confirmado
// do lado do gateway). Nunca expõe a chave secreta do gateway pro navegador
// — a consulta acontece aqui, no servidor; o cliente só recebe o status.
//
// Usa getPaymentProvider() (a mesma fábrica usada em todo o resto da camada
// de pagamentos) em vez de falar direto com um gateway específico — funciona
// com qualquer provider ativo (PYX Gate hoje, Zendry se um dia voltar a ser
// o rollback ativo) sem precisar de rota dedicada por gateway.
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId é obrigatório." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  // Já confirmado (por webhook, por outro ciclo de polling, ou pago por
  // cartão na resposta síncrona) — não precisa consultar o gateway de novo.
  if (order.payment_status === "confirmed") {
    return NextResponse.json({ status: "approved" });
  }

  const { data: payment } = await service
    .from("payments")
    .select("external_id")
    .eq("order_id", orderId)
    .single();

  if (!payment?.external_id) {
    return NextResponse.json({ status: "pending" });
  }

  try {
    const result = await getPaymentProvider().verifyPayment(payment.external_id);

    if (result.status === "approved") {
      await processPaymentResult({ service, orderId, status: "approved", paidAt: result.paidAt });
    } else if (result.status === "rejected" || result.status === "cancelled") {
      await processPaymentResult({ service, orderId, status: result.status });
    }

    return NextResponse.json({ status: result.status });
  } catch {
    // Gateway sem consulta disponível pra esse pagamento, ou erro de rede —
    // não é um erro fatal pro polling, só significa "ainda não sabemos".
    return NextResponse.json({ status: "pending" });
  }
}
