import { headers } from "next/headers";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS = 8;

// Limite por IP (hash, nunca guardamos o IP em texto puro) — persistido no
// banco porque o projeto roda em ambiente serverless: um contador em memória
// não sobreviveria entre invocações/instâncias diferentes.
export async function checkAndRecordLookupAttempt(): Promise<{ allowed: boolean }> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

  const service = createServiceClient();

  // Limpeza oportunista de tentativas com mais de 24h — mantém a tabela
  // pequena sem precisar de nenhum job agendado.
  await service
    .from("order_lookup_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await service
    .from("order_lookup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  await service.from("order_lookup_attempts").insert({ ip_hash: ipHash });
  return { allowed: true };
}
