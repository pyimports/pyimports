"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminWrite } from "@/lib/auth/admin-guard";
import type { Announcement, AnnouncementType } from "@/types";

export interface AnnouncementFormData {
  type: AnnouncementType;
  title: string;
  message: string;
  coupon_code?: string;
  is_active?: boolean;
  display_order?: number;
}

function toAnnouncement(row: {
  id: string;
  type: string;
  title: string;
  message: string;
  coupon_code: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}): Announcement {
  return {
    id:            row.id,
    type:          row.type as AnnouncementType,
    title:         row.title,
    message:       row.message,
    coupon_code:   row.coupon_code ?? undefined,
    is_active:     row.is_active,
    display_order: row.display_order,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
  };
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  await requireAdmin();
  const service = createServiceClient();
  const { data, error } = await service
    .from("announcements")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toAnnouncement);
}

export async function createAnnouncement(
  formData: AnnouncementFormData
): Promise<{ id: string } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!formData.title.trim())   return { error: "Título é obrigatório." };
  if (!formData.message.trim()) return { error: "Mensagem é obrigatória." };
  if (formData.type === "cupom" && !formData.coupon_code?.trim()) {
    return { error: "Código do cupom é obrigatório." };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("announcements")
    .insert({
      type:          formData.type,
      title:         formData.title.trim(),
      message:       formData.message.trim(),
      coupon_code:   formData.type === "cupom" ? formData.coupon_code!.trim().toUpperCase() : null,
      is_active:     formData.is_active ?? true,
      display_order: formData.display_order ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/anuncios");
  return { id: data.id };
}

export async function updateAnnouncement(
  id: string,
  formData: Partial<AnnouncementFormData>
): Promise<{ ok: true } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (formData.type === "cupom" && !formData.coupon_code?.trim()) {
    return { error: "Código do cupom é obrigatório." };
  }

  const service = createServiceClient();
  const patch = {
    ...(formData.type          !== undefined && { type: formData.type }),
    ...(formData.title         !== undefined && { title: formData.title.trim() }),
    ...(formData.message       !== undefined && { message: formData.message.trim() }),
    ...(formData.coupon_code   !== undefined && {
      coupon_code: formData.type === "cupom" ? formData.coupon_code.trim().toUpperCase() : null,
    }),
    ...(formData.is_active     !== undefined && { is_active: formData.is_active }),
    ...(formData.display_order !== undefined && { display_order: formData.display_order }),
  };

  const { error } = await service.from("announcements").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/anuncios");
  return { ok: true };
}

export async function deleteAnnouncement(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();
  const { error } = await service.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/anuncios");
  return { ok: true };
}

export async function toggleAnnouncementActive(
  id: string,
  is_active: boolean
): Promise<{ ok: true } | { error: string }> {
  return updateAnnouncement(id, { is_active });
}
