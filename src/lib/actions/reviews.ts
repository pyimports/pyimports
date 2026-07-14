"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { toYoutubeEmbedUrl } from "@/lib/formatters";
import type { Review } from "@/types";
import type { DbReview } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Guard — mesmo padrão de src/lib/actions/categories.ts
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/admin/login");
}

function toReview(row: DbReview): Review {
  return {
    id:                  row.id,
    customer_name:       row.customer_name,
    rating:              row.rating,
    state:               row.state,
    delivery_days_label: row.delivery_days_label,
    comment:             row.comment,
    image_url:           row.image_url          ?? undefined,
    image_storage_path:  row.image_storage_path ?? undefined,
    image_object_position_x: row.image_object_position_x,
    image_object_position_y: row.image_object_position_y,
    image_scale:              row.image_scale,
    video_url:           row.video_url          ?? undefined,
    product_ids:         row.product_ids ?? [],
    is_active:           row.is_active,
    display_order:       row.display_order,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Tipos do formulário
// ---------------------------------------------------------------------------

export interface ReviewFormData {
  customer_name: string;
  rating: number;
  state: string;
  delivery_days_label: string;
  comment: string;
  image_url?: string;
  image_storage_path?: string;
  image_object_position_x?: number;
  image_object_position_y?: number;
  image_scale?: number;
  video_url?: string;
  product_ids?: string[];
  is_active: boolean;
  display_order: number;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function getAllReviewsAdmin(): Promise<Review[]> {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toReview(row as DbReview));
}

export async function createReview(data: ReviewFormData): Promise<{ error?: string }> {
  await requireAdmin();

  if (!data.customer_name.trim()) return { error: "Nome do cliente é obrigatório." };
  if (!data.state.trim()) return { error: "Estado é obrigatório." };
  if (!data.delivery_days_label.trim()) return { error: "Prazo de entrega é obrigatório." };
  if (!data.comment.trim()) return { error: "Texto do depoimento é obrigatório." };
  if (data.rating < 0 || data.rating > 5) return { error: "Avaliação deve ser entre 0 e 5." };

  const supabase = createServiceClient();

  const { error } = await supabase.from("reviews").insert({
    customer_name:       data.customer_name.trim(),
    rating:              data.rating,
    state:               data.state.trim(),
    delivery_days_label: data.delivery_days_label.trim(),
    comment:             data.comment.trim(),
    image_url:           data.image_url          || null,
    image_storage_path:  data.image_storage_path || null,
    image_object_position_x: data.image_object_position_x ?? 50,
    image_object_position_y: data.image_object_position_y ?? 50,
    image_scale:              data.image_scale             ?? 1,
    video_url:           data.video_url ? toYoutubeEmbedUrl(data.video_url) : null,
    product_ids:         data.product_ids ?? [],
    is_active:           data.is_active,
    display_order:       data.display_order,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/feedbacks");
  revalidatePath("/");
  return {};
}

export async function updateReview(
  id: string,
  data: ReviewFormData
): Promise<{ error?: string }> {
  await requireAdmin();

  if (!data.customer_name.trim()) return { error: "Nome do cliente é obrigatório." };
  if (!data.state.trim()) return { error: "Estado é obrigatório." };
  if (!data.delivery_days_label.trim()) return { error: "Prazo de entrega é obrigatório." };
  if (!data.comment.trim()) return { error: "Texto do depoimento é obrigatório." };
  if (data.rating < 0 || data.rating > 5) return { error: "Avaliação deve ser entre 0 e 5." };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("reviews")
    .update({
      customer_name:       data.customer_name.trim(),
      rating:              data.rating,
      state:               data.state.trim(),
      delivery_days_label: data.delivery_days_label.trim(),
      comment:             data.comment.trim(),
      image_url:           data.image_url          || null,
      image_storage_path:  data.image_storage_path || null,
      video_url:           data.video_url ? toYoutubeEmbedUrl(data.video_url) : null,
      product_ids:         data.product_ids ?? [],
      is_active:           data.is_active,
      display_order:       data.display_order,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/feedbacks");
  revalidatePath("/");
  return {};
}

export async function deleteReview(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  const supabase = createServiceClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("image_storage_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { error: error.message };

  if (review?.image_storage_path) {
    await supabase.storage.from("reviews").remove([review.image_storage_path]);
  }

  revalidatePath("/admin/feedbacks");
  revalidatePath("/");
  return {};
}

export async function toggleReviewActive(
  id: string,
  is_active: boolean
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase.from("reviews").update({ is_active }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/feedbacks");
  revalidatePath("/");
  return {};
}

// Reordenação via drag-and-drop — recebe os IDs já na ordem final e grava
// display_order = posição no array, em lote.
export async function reorderReviews(orderedIds: string[]): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = createServiceClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("reviews").update({ display_order: index }).eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/admin/feedbacks");
  revalidatePath("/");
  return {};
}
