import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaymentPreferenceForOrder } from "@/lib/payments/create-preference";

// POST /api/payments/create-preference — { orderId }
// Cria (ou recria, em caso de retry) a preferência de pagamento de um pedido
// já existente. Não exige sessão admin: o pedido acabou de ser criado pelo
// próprio cliente no checkout, e a única coisa que esse endpoint expõe é a
// URL de checkout/PIX do próprio pedido.
export async function POST(request: NextRequest) {
  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "orderId é obrigatório" }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await createPaymentPreferenceForOrder(service, body.orderId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
