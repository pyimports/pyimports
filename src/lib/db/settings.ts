import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/types";
import type { DbStoreSettingsPublic, DbStoreSettingsPrivate, DbAdminProfile } from "@/types/database.types";

export interface PublicStoreSettings {
  store_name: string;
  logo_url?: string;
  whatsapp_number: string;
  whatsapp_default_message: string;
  email?: string;
  address?: string;
}

function toPublicSettings(row: DbStoreSettingsPublic): PublicStoreSettings {
  return {
    store_name: row.store_name,
    logo_url: row.logo_url ?? undefined,
    whatsapp_number: row.whatsapp_number,
    whatsapp_default_message: row.whatsapp_default_message,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
  };
}

const FALLBACK_PUBLIC_SETTINGS: PublicStoreSettings = {
  store_name: "PYimports",
  whatsapp_number: "5511999999999",
  whatsapp_default_message: "Olá! Vim pela loja e tenho uma dúvida.",
};

// Leitura pública (anon) — usada em Server Components do site público.
// cache() evita repetir a query quando várias partes do layout pedem as
// configurações na mesma requisição.
export const getPublicStoreSettings = cache(async (): Promise<PublicStoreSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("store_settings_public")
      .select("store_name, logo_url, whatsapp_number, whatsapp_default_message, email, address")
      .eq("lock", true)
      .single();

    if (error || !data) return FALLBACK_PUBLIC_SETTINGS;
    return toPublicSettings(data as DbStoreSettingsPublic);
  } catch {
    return FALLBACK_PUBLIC_SETTINGS;
  }
});

export interface AdminStoreSettings {
  store_name: string;
  logo_url?: string;
  whatsapp_number: string;
  whatsapp_default_message: string;
  email?: string;
  address?: string;
  cnpj_cpf?: string;
  maintenance_mode: boolean;
}

// Leitura completa (público + privado) para o painel admin — usa service client
export async function getAdminStoreSettings(): Promise<AdminStoreSettings> {
  const service = createServiceClient();

  const [{ data: pub, error: pubError }, { data: priv, error: privError }] = await Promise.all([
    service.from("store_settings_public").select("*").eq("lock", true).single(),
    service.from("store_settings_private").select("maintenance_mode").eq("lock", true).single(),
  ]);

  if (pubError) throw pubError;
  if (privError) throw privError;

  const p = pub as DbStoreSettingsPublic;
  const s = priv as Pick<DbStoreSettingsPrivate, "maintenance_mode">;

  return {
    store_name: p.store_name,
    logo_url: p.logo_url ?? undefined,
    whatsapp_number: p.whatsapp_number,
    whatsapp_default_message: p.whatsapp_default_message,
    email: p.email ?? undefined,
    address: p.address ?? undefined,
    cnpj_cpf: p.cnpj_cpf ?? undefined,
    maintenance_mode: s.maintenance_mode,
  };
}

function toAdminProfile(row: DbAdminProfile): AdminProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as "owner" | "manager",
    avatar_url: row.avatar_url ?? undefined,
    created_at: row.created_at,
    last_login: row.last_login ?? undefined,
  };
}

// Lido no PublicLayout (Server Component) para bloquear o site público
// quando o admin liga o modo de manutenção. Usa service client porque
// store_settings_private nunca é exposta ao anon.
export async function isMaintenanceModeActive(): Promise<boolean> {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("store_settings_private")
      .select("maintenance_mode")
      .eq("lock", true)
      .single();

    if (error || !data) return false;
    return data.maintenance_mode;
  } catch {
    return false;
  }
}

export async function getAdminUsers(): Promise<AdminProfile[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("admin_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toAdminProfile(row as DbAdminProfile));
}
