"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminWrite } from "@/lib/auth/admin-guard";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Configurações da loja (Loja, Manutenção, WhatsApp, Logo)
// ---------------------------------------------------------------------------

export interface StoreSettingsFormData {
  store_name: string;
  email: string;
  address: string;
  cnpj_cpf: string;
  whatsapp_number: string;
  whatsapp_default_message: string;
  logo_url: string;
  maintenance_mode: boolean;
}

export async function updateStoreSettings(
  data: StoreSettingsFormData
): Promise<{ error: string } | { ok: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();

  const { error: pubError } = await service
    .from("store_settings_public")
    .update({
      store_name: data.store_name,
      email: data.email || null,
      address: data.address || null,
      cnpj_cpf: data.cnpj_cpf || null,
      whatsapp_number: data.whatsapp_number,
      whatsapp_default_message: data.whatsapp_default_message,
      logo_url: data.logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("lock", true);

  if (pubError) {
    return { error: extractErrorMessage(pubError, "Erro ao salvar configurações da loja.") };
  }

  const { error: privError } = await service
    .from("store_settings_private")
    .update({
      maintenance_mode: data.maintenance_mode,
      updated_at: new Date().toISOString(),
    })
    .eq("lock", true);

  if (privError) {
    return { error: extractErrorMessage(privError, "Erro ao salvar modo de manutenção.") };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Usuários administrativos
// ---------------------------------------------------------------------------

export async function inviteAdminUser(
  email: string,
  password: string,
  name: string,
  role: "owner" | "manager" | "viewer"
): Promise<{ error: string } | { ok: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return { error: extractErrorMessage(createError, "Erro ao criar usuário.") };
  }

  const { error: profileError } = await service.from("admin_profiles").insert({
    id: created.user.id,
    email,
    name,
    role,
  });

  if (profileError) {
    // Reverte a criação no Auth para não deixar um usuário órfão sem perfil
    await service.auth.admin.deleteUser(created.user.id);
    return { error: extractErrorMessage(profileError, "Erro ao criar perfil de admin.") };
  }

  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

export async function removeAdminUser(id: string): Promise<{ error: string } | { ok: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (id === guard.id) {
    return { error: "Você não pode remover o próprio usuário." };
  }

  const service = createServiceClient();

  const { error: profileError } = await service.from("admin_profiles").delete().eq("id", id);
  if (profileError) {
    return { error: extractErrorMessage(profileError, "Erro ao remover perfil de admin.") };
  }

  const { error: authError } = await service.auth.admin.deleteUser(id);
  if (authError) {
    return { error: extractErrorMessage(authError, "Perfil removido, mas falhou ao remover o acesso.") };
  }

  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
