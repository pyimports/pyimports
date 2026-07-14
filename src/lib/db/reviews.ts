import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types";
import type { DbReview } from "@/types/database.types";

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

// Depoimentos ativos para a home, ordenados pela ordem de exibição definida no admin
export async function getActiveReviews(): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toReview(row as DbReview));
}
