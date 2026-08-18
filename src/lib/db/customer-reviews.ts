import { createClient } from "@/lib/supabase/server";
import type { CustomerReview, CustomerReviewProduct, ServiceRating } from "@/types";
import type { DbCustomerReview } from "@/types/database.types";

export interface CustomerReviewsSummary {
  reviews: CustomerReview[];
  averageRating: number;
  totalCount: number;
  // Índice 0 = quantidade de avaliações com 1 estrela, ..., índice 4 = 5 estrelas.
  starCounts: number[];
}

function toCustomerReview(row: DbCustomerReview): CustomerReview {
  return {
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    rating: row.rating,
    service_rating: row.service_rating as ServiceRating,
    purchase_date: row.purchase_date,
    delivery_date: row.delivery_date,
    description: row.description,
    products: (row.products as unknown as CustomerReviewProduct[] | null) ?? [],
    images: row.images ?? [],
    status: row.status as CustomerReview["status"],
    reviewed_at: row.reviewed_at ?? undefined,
    created_at: row.created_at,
  };
}

// Leitura pública (anon, protegida por RLS: só linhas status='approved') —
// usada na página /avaliacoes.
export async function getApprovedCustomerReviews(): Promise<CustomerReviewsSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_reviews")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as DbCustomerReview[];
  const reviews = rows.map(toCustomerReview);

  const starCounts = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++;
  }

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return { reviews, averageRating, totalCount: reviews.length, starCounts };
}
