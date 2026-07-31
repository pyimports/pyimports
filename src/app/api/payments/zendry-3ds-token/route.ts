import { NextResponse } from "next/server";
import { getZendryAccessToken } from "@/lib/payments/zendry-provider";

// Devolve o access_token do backend pro SDK de 3DS (ZendrySDKThreeds.init_threeds,
// que roda no navegador do cliente) — a Zendry confirmou que é o MESMO token
// Bearer usado nas chamadas server-to-server, e que esse fluxo específico não
// pode ser protegido por whitelist de IP. Exposição consciente, decidida
// junto com o dono da loja depois de avaliar as alternativas (ver
// src/lib/payments/mode.ts). Só existe enquanto PAYMENT_MODE === "gateway".
export async function GET() {
  try {
    const token = await getZendryAccessToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar token de autenticação." }, { status: 500 });
  }
}
