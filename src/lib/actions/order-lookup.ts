"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { checkAndRecordLookupAttempt } from "@/lib/order-lookup-rate-limit";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import { maskPhoneDisplay, maskEmailDisplay } from "@/lib/mask";
import type { OrderStatus, PaymentStatus, PaymentMethod, OrderStatusHistory } from "@/types";

// ---------------------------------------------------------------------------
// Busca pública de pedidos (sem login) — só por CPF, sem 2º fator de
// confirmação (decisão consciente: simplicidade para o cliente em troca de
// não confirmar que quem busca é o dono do CPF). Nunca expõe dado bruto: o
// mascaramento acontece aqui, antes de montar a resposta.
// ---------------------------------------------------------------------------

const NOT_FOUND_MESSAGE =
  "Não encontramos pedidos com esse CPF. Confira o número ou fale com nosso atendimento.";
const RATE_LIMIT_MESSAGE = "Muitas tentativas de busca. Aguarde alguns minutos e tente novamente.";

export interface PublicOrderItem {
  id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price_pix: number;
  subtotal: number;
  variant_color_name?: string;
  variant_color_hex?: string;
  variant_size?: string;
}

export interface PublicOrderDetail {
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: string;
  subtotal: number;
  coupon_discount: number;
  shipping_value: number;
  total: number;
  customer_name: string;
  customer_phone_masked: string | null;
  customer_email_masked: string;
  shipping_city: string;
  shipping_neighborhood: string;
  shipping_state: string;
  shipping_service: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  items: PublicOrderItem[];
  status_history: OrderStatusHistory[];
}

export type OrderListLookupResult = { error: string } | { orders: PublicOrderDetail[] };

const ORDER_PUBLIC_FIELDS = `
  id, order_number, customer_id, customer_name, customer_phone, customer_email,
  status, payment_status, payment_method,
  shipping_city, shipping_neighborhood, shipping_state, shipping_service,
  tracking_code, tracking_url,
  subtotal, coupon_discount, shipping_value, total,
  created_at,
  order_items ( id, product_name, product_image, quantity, unit_price_pix, subtotal, variant_color_name, variant_color_hex, variant_size ),
  order_status_history ( id, order_id, previous_status, new_status, changed_by, notes, created_at )
` as const;

interface OrderPublicRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_city: string;
  shipping_neighborhood: string;
  shipping_state: string;
  shipping_service: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  subtotal: number;
  coupon_discount: number;
  shipping_value: number;
  total: number;
  created_at: string;
  order_items?: {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price_pix: number;
    subtotal: number;
    variant_color_name: string | null;
    variant_color_hex: string | null;
    variant_size: string | null;
  }[];
  order_status_history?: {
    id: string;
    order_id: string;
    previous_status: string | null;
    new_status: string;
    changed_by: string;
    notes: string | null;
    created_at: string;
  }[];
}

function toPublicOrderDetail(row: OrderPublicRow): PublicOrderDetail {
  return {
    order_number: row.order_number,
    status: row.status as OrderStatus,
    payment_status: row.payment_status as PaymentStatus,
    payment_method: row.payment_method as PaymentMethod,
    created_at: row.created_at,
    subtotal: Number(row.subtotal),
    coupon_discount: Number(row.coupon_discount),
    shipping_value: Number(row.shipping_value),
    total: Number(row.total),
    customer_name: row.customer_name,
    customer_phone_masked: maskPhoneDisplay(row.customer_phone),
    customer_email_masked: maskEmailDisplay(row.customer_email),
    shipping_city: row.shipping_city,
    shipping_neighborhood: row.shipping_neighborhood,
    shipping_state: row.shipping_state,
    shipping_service: row.shipping_service,
    tracking_code: row.tracking_code,
    tracking_url: row.tracking_url,
    items: (row.order_items ?? []).map((i) => ({
      id: i.id,
      product_name: i.product_name,
      product_image: i.product_image ?? undefined,
      quantity: i.quantity,
      unit_price_pix: Number(i.unit_price_pix),
      subtotal: Number(i.subtotal),
      variant_color_name: i.variant_color_name ?? undefined,
      variant_color_hex: i.variant_color_hex ?? undefined,
      variant_size: i.variant_size ?? undefined,
    })),
    status_history: (row.order_status_history ?? [])
      .map((h) => ({
        id: h.id,
        order_id: h.order_id,
        previous_status: (h.previous_status ?? undefined) as OrderStatus | undefined,
        new_status: h.new_status as OrderStatus,
        changed_by: h.changed_by,
        notes: h.notes ?? undefined,
        created_at: h.created_at,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  };
}

export async function lookupOrdersByCpf(cpfRaw: string): Promise<OrderListLookupResult> {
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

  const { data: rows } = await service
    .from("orders")
    .select(ORDER_PUBLIC_FIELDS)
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });

  if (!rows || rows.length === 0) return { error: NOT_FOUND_MESSAGE };
  return { orders: (rows as unknown as OrderPublicRow[]).map(toPublicOrderDetail) };
}
