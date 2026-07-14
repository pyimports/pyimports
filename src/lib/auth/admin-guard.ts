// Guarda compartilhada por toda Server Action e Route Handler do admin.
// "viewer" é um papel somente-leitura: loga e vê tudo no painel, mas
// nenhuma escrita (criar/editar/excluir/upload) pode ser persistida —
// requireAdminWrite() bloqueia esse papel em vez de redirecionar, já que a
// conta está autenticada, só não tem permissão para a ação.

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const READ_ONLY_ERROR =
  "Sua conta tem acesso somente para visualização — esta ação não pode ser salva.";

export interface AdminSession {
  id: string;
  role: string;
}

async function getSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return profile ? { id: profile.id, role: profile.role } : null;
}

// Server Actions de LEITURA — qualquer papel autenticado passa (inclusive viewer).
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

// Server Actions de ESCRITA — bloqueia "viewer" com um erro (não redireciona:
// a conta está autenticada, só não tem permissão para essa ação específica).
export async function requireAdminWrite(): Promise<AdminSession | { error: string }> {
  const session = await requireAdmin();
  if (session.role === "viewer") return { error: READ_ONLY_ERROR };
  return session;
}

// Route Handlers (API routes) — nunca redireciona, quem chama decide o status HTTP.
export async function getAdminSessionForApi(): Promise<AdminSession | null> {
  return getSession();
}
