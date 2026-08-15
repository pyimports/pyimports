import { NextResponse } from "next/server";
import { pyxgateFetch } from "@/lib/payments/pyxgate-provider";

// Devolve o token pro SDK de 3DS (ZendrySDKThreeds.init_threeds, roda no
// navegador do cliente) — proxy pra GET /v1/card_authentications/token da
// PYX Gate. A própria doc da PYX Gate confirma que esse token NÃO é
// escopado só pra 3DS ("é o mesmo Bearer que autentica toda a comunicação
// da PYX Gate com a Zendry") — mesma exposição de risco já aceita
// conscientemente na integração direta com a Zendry, agora mediada pela
// PYX Gate. Só existe enquanto o provider ativo for pyxgate.
export async function GET() {
  try {
    const { token } = await pyxgateFetch<{ token: string }>("/card_authentications/token", {
      method: "GET",
    });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar token de autenticação." }, { status: 500 });
  }
}
