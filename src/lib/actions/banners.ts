"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminWrite } from "@/lib/auth/admin-guard";
import { routes } from "@/lib/routes";
import type { HomeBanner } from "@/types";
import type { Database } from "@/types/database.types";

type BannerUpdate = Database["public"]["Tables"]["home_banners"]["Update"];

export interface BannerFormData {
  title?: string;
  subtitle?: string;
  image_url: string;
  storage_path?: string;
  image_mobile_url?: string;
  mobile_storage_path?: string;
  link_url?: string;
  link_label?: string;
  link_type?: "product" | "category" | "url";
  link_product_id?: string | null;
  link_category_id?: string | null;
  is_active?: boolean;
  display_order?: number;
  desktop_object_position_x?: number;
  desktop_object_position_y?: number;
  desktop_scale?: number;
  mobile_object_position_x?: number;
  mobile_object_position_y?: number;
  mobile_scale?: number;
}

// Resolve link_url automaticamente a partir do produto/categoria selecionado —
// o admin escolhe o destino estruturado, nunca digita a URL manualmente
// (exceto quando link_type === "url").
async function resolveLinkUrl(
  service: ReturnType<typeof createServiceClient>,
  formData: Pick<BannerFormData, "link_type" | "link_product_id" | "link_category_id" | "link_url">
): Promise<{ link_url: string | null; error?: string }> {
  const linkType = formData.link_type ?? "url";

  if (linkType === "product") {
    if (!formData.link_product_id) return { link_url: null, error: "Selecione um produto." };
    const { data } = await service
      .from("products")
      .select("slug")
      .eq("id", formData.link_product_id)
      .single();
    if (!data) return { link_url: null, error: "Produto selecionado não encontrado." };
    return { link_url: routes.produto(data.slug) };
  }

  if (linkType === "category") {
    if (!formData.link_category_id) return { link_url: null, error: "Selecione uma categoria." };
    const { data } = await service
      .from("categories")
      .select("slug")
      .eq("id", formData.link_category_id)
      .single();
    if (!data) return { link_url: null, error: "Categoria selecionada não encontrada." };
    return { link_url: routes.categoria(data.slug) };
  }

  return { link_url: formData.link_url || null };
}

export async function getAllBanners(): Promise<HomeBanner[]> {
  await requireAdmin();
  const service = createServiceClient();
  const { data, error } = await service
    .from("home_banners")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeBanner[];
}

export async function createBanner(
  formData: BannerFormData
): Promise<{ id: string; link_url: string | null } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!formData.image_url) return { error: "image_url é obrigatório" };

  const service = createServiceClient();

  const resolved = await resolveLinkUrl(service, formData);
  if (resolved.error) return { error: resolved.error };

  const { data, error } = await service
    .from("home_banners")
    .insert({
      title:                     formData.title                     || null,
      subtitle:                  formData.subtitle                  || null,
      image_url:                 formData.image_url,
      storage_path:              formData.storage_path              || null,
      image_mobile_url:          formData.image_mobile_url          || null,
      mobile_storage_path:       formData.mobile_storage_path       || null,
      link_url:                  resolved.link_url,
      link_label:                formData.link_label                || "Ver produtos",
      link_type:                 formData.link_type                 ?? "url",
      link_product_id:           formData.link_type === "product" ? formData.link_product_id : null,
      link_category_id:          formData.link_type === "category" ? formData.link_category_id : null,
      is_active:                 formData.is_active                 ?? true,
      display_order:             formData.display_order             ?? 0,
      desktop_object_position_x: formData.desktop_object_position_x ?? 50,
      desktop_object_position_y: formData.desktop_object_position_y ?? 50,
      desktop_scale:             formData.desktop_scale             ?? 1,
      mobile_object_position_x:  formData.mobile_object_position_x  ?? 50,
      mobile_object_position_y:  formData.mobile_object_position_y  ?? 50,
      mobile_scale:              formData.mobile_scale              ?? 1,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { id: data.id, link_url: resolved.link_url };
}

export async function updateBanner(
  id: string,
  formData: Partial<BannerFormData>
): Promise<{ ok: true; link_url?: string | null } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();

  let resolvedLinkUrl: string | null | undefined;
  if (formData.link_type !== undefined) {
    const resolved = await resolveLinkUrl(service, formData);
    if (resolved.error) return { error: resolved.error };
    resolvedLinkUrl = resolved.link_url;
  }

  const patch: BannerUpdate = {
    ...(formData.title              !== undefined && { title:                     formData.title || null }),
    ...(formData.subtitle           !== undefined && { subtitle:                  formData.subtitle || null }),
    ...(formData.image_url          !== undefined && { image_url:                 formData.image_url }),
    ...(formData.storage_path       !== undefined && { storage_path:              formData.storage_path || null }),
    ...(formData.image_mobile_url   !== undefined && { image_mobile_url:          formData.image_mobile_url || null }),
    ...(formData.mobile_storage_path !== undefined && { mobile_storage_path:      formData.mobile_storage_path || null }),
    ...(resolvedLinkUrl             !== undefined && { link_url:                  resolvedLinkUrl }),
    ...(formData.link_type          !== undefined && { link_type:                 formData.link_type }),
    ...(formData.link_type          !== undefined && { link_product_id:           formData.link_type === "product" ? formData.link_product_id ?? null : null }),
    ...(formData.link_type          !== undefined && { link_category_id:          formData.link_type === "category" ? formData.link_category_id ?? null : null }),
    ...(formData.link_label         !== undefined && { link_label:                formData.link_label || "Ver produtos" }),
    ...(formData.is_active          !== undefined && { is_active:                 formData.is_active }),
    ...(formData.display_order      !== undefined && { display_order:             formData.display_order }),
    ...(formData.desktop_object_position_x !== undefined && { desktop_object_position_x: formData.desktop_object_position_x }),
    ...(formData.desktop_object_position_y !== undefined && { desktop_object_position_y: formData.desktop_object_position_y }),
    ...(formData.desktop_scale      !== undefined && { desktop_scale:             formData.desktop_scale }),
    ...(formData.mobile_object_position_x  !== undefined && { mobile_object_position_x:  formData.mobile_object_position_x }),
    ...(formData.mobile_object_position_y  !== undefined && { mobile_object_position_y:  formData.mobile_object_position_y }),
    ...(formData.mobile_scale       !== undefined && { mobile_scale:              formData.mobile_scale }),
  };

  const { error } = await service.from("home_banners").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true, link_url: resolvedLinkUrl };
}

export async function deleteBanner(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();
  const { error } = await service.from("home_banners").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true };
}

export async function toggleBannerActive(
  id: string,
  is_active: boolean
): Promise<{ ok: true } | { error: string }> {
  return updateBanner(id, { is_active });
}
