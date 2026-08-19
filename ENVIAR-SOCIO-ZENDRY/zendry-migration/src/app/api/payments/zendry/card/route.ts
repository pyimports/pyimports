import { NextRequest, NextResponse } from "next/server";
import { createCardPayment } from "@/lib/zendry/card";
import { computeCardTotal, MAX_CARD_INSTALLMENTS } from "@/lib/zendry/status-mapper";
import type { ZendryThreedsData } from "@/lib/zendry/types";

// POST /api/payments/zendry/card
// Processa um pagamento de cartão já autenticado por 3DS no navegador (ver
// ZENDRY-MIGRATION.md, seção "Cartão + 3DS" — o SDK client-side roda ANTES
// desta chamada, e o resultado (threedsData) chega pronto aqui).
//
// SEGURANÇA: nunca logue `cardNumber`/`cardSecurityCode` — nem em erro, nem
// em métricas, nem no corpo de nenhuma resposta.
//
// ADAPTE ANTES DE USAR — os pontos TODO dependem do banco do projeto novo.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    orderId?: string;
    cardNumber?: string;
    cardExpirationDate?: string; // "MMyyyy"
    cardSecurityCode?: string;
    cardHolderName?: string;
    cardHolderDocument?: string;
    installments?: number;
    threedsData?: ZendryThreedsData;
  };

  if (
    !body.orderId || !body.cardNumber || !body.cardExpirationDate ||
    !body.cardSecurityCode || !body.cardHolderName || !body.cardHolderDocument ||
    !body.installments || !body.threedsData?.operation_session_id
  ) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (body.installments < 1 || body.installments > MAX_CARD_INSTALLMENTS) {
    return NextResponse.json({ error: "Número de parcelas inválido." }, { status: 400 });
  }

  // TODO: busque o pedido no seu banco (valor BASE, sem taxa de cartão —
  // computeCardTotal já soma a taxa da parcela em cima disso). Exemplo:
  //   const order = await db.orders.findById(body.orderId);
  //   if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  //   if (order.paymentStatus === "confirmed") return NextResponse.json({ ok: true }); // idempotente
  const orderBaseTotal = 0; // TODO: order.total

  // Nunca confia num total mandado pelo client — sempre recalcula aqui a
  // partir do valor base do pedido guardado no seu banco.
  const cardTotal = computeCardTotal(orderBaseTotal, body.installments);

  let result;
  try {
    result = await createCardPayment({
      externalId: body.orderId,
      amountBRL: cardTotal,
      cardNumber: body.cardNumber,
      cardExpirationDate: body.cardExpirationDate,
      cardSecurityCode: body.cardSecurityCode,
      cardHolderName: body.cardHolderName,
      cardHolderDocument: body.cardHolderDocument,
      installments: body.installments,
      threedsData: body.threedsData,
    });
  } catch {
    // Nunca inclui o corpo da requisição (tem dados do cartão) no erro.
    return NextResponse.json({ error: "Erro de conexão com o gateway de pagamento." }, { status: 502 });
  }

  // TODO: persista result.muid como external_id do pagamento (é o que o
  // webhook vai usar pra casar o evento com este pedido), e
  // result.lastDigits/result.brand pra exibir no admin. NUNCA persista
  // cardNumber/cardSecurityCode em nenhuma coluna/log/metadata:
  //   await db.payments.updateByOrderId(body.orderId, {
  //     method: "card", external_id: result.muid,
  //   });

  if (result.status === "waiting_3ds_authentication") {
    return NextResponse.json(
      { error: "Esse cartão exige uma etapa extra de segurança. Tente outro cartão ou pague com Pix." },
      { status: 402 }
    );
  }
  if (result.status !== "accepted") {
    return NextResponse.json({ error: "Pagamento recusado pela operadora do cartão." }, { status: 402 });
  }

  // TODO: marque o pedido como pago no seu banco (equivalente a
  // processPaymentResult do projeto de origem — status "confirmed" +
  // qualquer baixa de estoque/trigger que você tiver):
  //   await db.orders.markPaid(body.orderId, { paidAt: new Date().toISOString() });

  return NextResponse.json({ ok: true });
}
