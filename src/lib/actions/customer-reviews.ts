"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { checkAndRecordLookupAttempt } from "@/lib/order-lookup-rate-limit";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import { requireAdmin, requireAdminWrite } from "@/lib/auth/admin-guard";
import { routes } from "@/lib/routes";
import type { CustomerReview, CustomerReviewProduct, ServiceRating } from "@/types";
import type { DbCustomerReview, Json } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Avaliação enviada pelo próprio cliente, vinculada a um pedido real
// (verificado por CPF, mesmo padrão de order-lookup.ts), com aprovação do
// admin antes de aparecer publicamente em /avaliacoes.
// ---------------------------------------------------------------------------

const NOT_FOUND_MESSAGE =
  "Não encontramos pedidos com esse CPF. Confira o número ou fale com nosso atendimento.";
const NO_ELIGIBLE_ORDERS_MESSAGE = "Todos os seus pedidos já foram avaliados. Obrigado!";
const RATE_LIMIT_MESSAGE = "Muitas tentativas de busca. Aguarde alguns minutos e tente novamente.";
const SERVICE_RATINGS: ServiceRating[] = ["pessimo", "ruim", "bom", "excelente"];

export interface ReviewableOrder {
  order_id: string;
  order_number: string;
  purchase_date: string;
  products: CustomerReviewProduct[];
}

export type ReviewableOrdersResult = { error: string } | { orders: ReviewableOrder[] };

// Busca os pedidos pagos desse CPF que ainda não têm avaliação — passo 1 do
// fluxo público de avaliação (o cliente escolhe qual pedido avaliar).
export async function lookupReviewableOrders(cpfRaw: string): Promise<ReviewableOrdersResult> {
  const { allowed } = await checkAndRecordLookupAttempt();
  if (!allowed) return { error: RATE_LIMIT_MESSAGE };

  if (!isValidCpf(cpfRaw)) return { error: "Informe um CPF válido." };

  const service = createServiceClient();
  const cpfDigits = digitsOnly(cpfRaw);

  const { data: customers } = await service
    .from("customers")
    .select("id")
    .eq("cpf_cnpj", cpfDigits);

  const customerIds = (customers ?? []).map((c) => c.id);
  if (customerIds.length === 0) return { error: NOT_FOUND_MESSAGE };

  const { data: orders } = await service
    .from("orders")
    .select(
      "id, order_number, payment_confirmed_at, created_at, order_items ( product_name, quantity )"
    )
    .in("customer_id", customerIds)
    .eq("payment_status", "confirmed")
    .order("created_at", { ascending: false });

  if (!orders || orders.length === 0) return { error: NOT_FOUND_MESSAGE };

  const { data: existingReviews } = await service
    .from("customer_reviews")
    .select("order_id")
    .in(
      "order_id",
      orders.map((o) => o.id)
    );
  const reviewedOrderIds = new Set((existingReviews ?? []).map((r) => r.order_id));

  const eligible = orders
    .filter((o) => !reviewedOrderIds.has(o.id))
    .map((o) => ({
      order_id: o.id,
      order_number: o.order_number,
      purchase_date: o.payment_confirmed_at ?? o.created_at,
      products: ((o.order_items ?? []) as { product_name: string; quantity: number }[]).map(
        (i) => ({ name: i.product_name, quantity: i.quantity })
      ),
    }));

  if (eligible.length === 0) return { error: NO_ELIGIBLE_ORDERS_MESSAGE };

  return { orders: eligible };
}

export interface SubmitCustomerReviewInput {
  cpf: string;
  orderId: string;
  rating: number;
  serviceRating: ServiceRating;
  deliveryDate: string;
  description: string;
  images: string[]; // URLs já enviadas via /api/reviews/upload-image
}

export type SubmitCustomerReviewResult = { error: string } | { success: true };

export async function submitCustomerReview(
  input: SubmitCustomerReviewInput
): Promise<SubmitCustomerReviewResult> {
  if (!isValidCpf(input.cpf)) return { error: "CPF inválido." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { error: "Nota inválida." };
  }
  if (!SERVICE_RATINGS.includes(input.serviceRating)) {
    return { error: "Avaliação de atendimento inválida." };
  }
  if (!input.deliveryDate.trim() || Number.isNaN(new Date(input.deliveryDate).getTime())) {
    return { error: "Data de entrega inválida." };
  }
  if (new Date(input.deliveryDate).getTime() > Date.now()) {
    return { error: "A data de entrega não pode ser no futuro." };
  }
  if (!input.description.trim() || input.description.trim().length < 5) {
    return { error: "Conte um pouco mais sobre sua experiência." };
  }
  if (input.description.length > 1500) {
    return { error: "Descrição muito longa (máximo 1500 caracteres)." };
  }
  if (input.images.length > 3) {
    return { error: "Máximo de 3 imagens." };
  }

  const service = createServiceClient();
  const cpfDigits = digitsOnly(input.cpf);

  const { data: order } = await service
    .from("orders")
    .select(
      "id, order_number, customer_id, customer_name, payment_status, status, payment_confirmed_at, created_at, order_items ( product_name, quantity )"
    )
    .eq("id", input.orderId)
    .single();

  if (!order) return { error: "Pedido não encontrado." };
  if (order.payment_status !== "confirmed") {
    return { error: "Esse pedido ainda não teve o pagamento confirmado." };
  }
  if (!order.customer_id) return { error: "Pedido não encontrado." };

  const { data: customer } = await service
    .from("customers")
    .select("cpf_cnpj")
    .eq("id", order.customer_id)
    .single();

  if (!customer || customer.cpf_cnpj !== cpfDigits) {
    return { error: "Esse pedido não pertence a esse CPF." };
  }

  const { data: existing } = await service
    .from("customer_reviews")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return { error: "Esse pedido já foi avaliado." };

  const products: CustomerReviewProduct[] = (
    (order.order_items ?? []) as { product_name: string; quantity: number }[]
  ).map((i) => ({ name: i.product_name, quantity: i.quantity }));

  const { error } = await service.from("customer_reviews").insert({
    order_id: order.id,
    customer_cpf: cpfDigits,
    customer_name: order.customer_name,
    order_number: order.order_number,
    rating: input.rating,
    service_rating: input.serviceRating,
    purchase_date: order.payment_confirmed_at ?? order.created_at,
    delivery_date: input.deliveryDate,
    description: input.description.trim(),
    products: products as unknown as Json,
    images: input.images,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "Esse pedido já foi avaliado." };
    return { error: "Não foi possível enviar sua avaliação. Tente novamente." };
  }

  revalidatePath(routes.admin.avaliacoes);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin — fila de moderação
// ---------------------------------------------------------------------------

export interface AdminCustomerReview extends CustomerReview {
  customer_cpf: string;
}

function toAdminCustomerReview(row: DbCustomerReview): AdminCustomerReview {
  return {
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    customer_cpf: row.customer_cpf,
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

export async function listCustomerReviewsAdmin(): Promise<AdminCustomerReview[]> {
  await requireAdmin(); // leitura: qualquer papel autenticado, inclusive viewer

  const service = createServiceClient();
  const { data, error } = await service
    .from("customer_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DbCustomerReview[]).map(toAdminCustomerReview);
}

export async function approveCustomerReview(id: string): Promise<{ error: string } | { success: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();
  const { error } = await service
    .from("customer_reviews")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(routes.admin.avaliacoes);
  revalidatePath(routes.avaliacoes);
  return { success: true };
}

export async function rejectCustomerReview(id: string): Promise<{ error: string } | { success: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();
  const { error } = await service
    .from("customer_reviews")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(routes.admin.avaliacoes);
  revalidatePath(routes.avaliacoes);
  return { success: true };
}

export async function deleteCustomerReview(id: string): Promise<{ error: string } | { success: true }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const service = createServiceClient();

  const { data: review } = await service
    .from("customer_reviews")
    .select("images")
    .eq("id", id)
    .single();

  if (review?.images?.length) {
    const paths = review.images
      .map((url) => url.split("/customer-review-images/")[1])
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await service.storage.from("customer-review-images").remove(paths);
    }
  }

  const { error } = await service.from("customer_reviews").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(routes.admin.avaliacoes);
  revalidatePath(routes.avaliacoes);
  return { success: true };
}
