import { NextRequest, NextResponse } from "next/server";
import { createPix } from "@/lib/zendry/pix";

// POST /api/payments/zendry/pix
// Cria uma cobrança Pix (QR Code + copia-e-cola) pra um pedido existente.
//
// ADAPTE ANTES DE USAR — os dois pontos marcados TODO abaixo dependem do
// banco/ORM do projeto novo (no projeto de origem eram tabelas `orders` +
// `payments` no Supabase; ver ZENDRY-MIGRATION.md pro DDL de referência).
export async function POST(request: NextRequest) {
  const { orderId } = (await request.json()) as { orderId?: string };
  if (!orderId) {
    return NextResponse.json({ error: "orderId é obrigatório." }, { status: 400 });
  }

  // TODO: busque o pedido no seu banco (valor total, nome/documento do
  // cliente, número/referência do pedido). Exemplo do projeto de origem:
  //   const order = await db.orders.findById(orderId);
  //   if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  const order = {
    total: 0, // TODO: order.total
    customerName: "", // TODO: order.customer_name
    customerDocument: undefined as string | undefined, // TODO: cpf/cnpj do cliente, se tiver
    orderNumber: orderId, // TODO: order.order_number (referência legível, ex.: "RF00006")
  };

  let result;
  try {
    result = await createPix({
      amountBRL: order.total,
      payerName: order.customerName,
      payerDocument: order.customerDocument,
      externalReference: order.orderNumber,
      expirationSeconds: 1800,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar cobrança Pix.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // TODO: persista result.referenceCode como external_id do pagamento, e
  // result.pixCode/result.qrCodeBase64 pra mostrar na tela — é isso que o
  // webhook (POST /api/webhooks/zendry) vai usar depois pra casar o evento
  // com este pedido:
  //   await db.payments.updateByOrderId(orderId, {
  //     external_id: result.referenceCode,
  //     pix_code: result.pixCode,
  //     pix_qr_url: `data:image/png;base64,${result.qrCodeBase64}`,
  //   });

  return NextResponse.json({
    pixCode: result.pixCode,
    pixQrUrl: `data:image/png;base64,${result.qrCodeBase64}`,
    referenceCode: result.referenceCode,
  });
}
