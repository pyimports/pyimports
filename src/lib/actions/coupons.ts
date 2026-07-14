"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminWrite } from "@/lib/auth/admin-guard";
import type { CouponType } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AdminCoupon {
  id: string;
  code: string;
  description_internal: string | null;
  type: CouponType;
  value: number;
  is_active: boolean;
  start_date: string | null;
  expiration_date: string | null;
  max_uses_total: number | null;
  max_uses_per_customer: number | null;
  min_order_value: number | null;
  uses_count: number;
  created_at: string;
  updated_at: string;
}

// Todos os campos como string para facilitar binding com inputs controlados.
// Strings vazias representam null no banco.
export interface CouponFormInput {
  code: string;
  description_internal: string;
  type: CouponType;
  value: string;              // "10" = 10%, "50.00" = R$50
  is_active: boolean;
  start_date: string;         // "YYYY-MM-DD" ou ""
  expiration_date: string;    // "YYYY-MM-DD" ou ""
  max_uses_total: string;     // "10" ou "" (ilimitado)
  max_uses_per_customer: string;
  min_order_value: string;    // "100.00" ou ""
}

export interface CouponUsageRow {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_email: string;
  discount_applied: number;
  created_at: string;
  order_number: string;
  customer_name: string;
  order_subtotal: number;
  order_total: number;
  order_status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function validate(input: CouponFormInput): string | null {
  const code = input.code.trim();
  if (!code) return "Código é obrigatório.";
  if (!/^[A-Z0-9_-]+$/i.test(code)) return "Código inválido. Use letras, números, traço ou underscore.";

  if (input.type === "percentage") {
    const v = parseFloat(input.value);
    if (isNaN(v) || v <= 0 || v >= 100) return "Percentual deve ser entre 1% e 99%.";
  }
  if (input.type === "fixed") {
    const v = parseFloat(input.value);
    if (isNaN(v) || v <= 0) return "Valor fixo deve ser maior que zero.";
  }

  if (input.max_uses_total.trim()) {
    const n = parseInt(input.max_uses_total, 10);
    if (isNaN(n) || n <= 0) return "Limite de usos deve ser um número inteiro positivo.";
  }
  if (input.max_uses_per_customer.trim()) {
    const n = parseInt(input.max_uses_per_customer, 10);
    if (isNaN(n) || n <= 0) return "Limite por cliente deve ser um número inteiro positivo.";
  }
  if (input.min_order_value.trim()) {
    const v = parseFloat(input.min_order_value);
    if (isNaN(v) || v < 0) return "Valor mínimo do pedido não pode ser negativo.";
  }
  if (input.start_date && input.expiration_date && input.start_date > input.expiration_date) {
    return "Data de início deve ser anterior à data de validade.";
  }

  // Sanidade: para cupom fixo, o desconto não deve ser maior que o pedido mínimo.
  // Ex: desconto=2400, mínimo=50 → provavelmente os campos estão trocados.
  if (input.type === "fixed" && input.min_order_value.trim()) {
    const discountVal = parseFloat(input.value);
    const minVal      = parseFloat(input.min_order_value);
    if (!isNaN(discountVal) && !isNaN(minVal) && discountVal > minVal) {
      return `Valor do desconto (R$${discountVal.toFixed(2)}) não pode ser maior que o pedido mínimo (R$${minVal.toFixed(2)}). Verifique se os campos estão corretos.`;
    }
  }

  return null;
}

function toDbPayload(input: CouponFormInput) {
  return {
    code:                   input.code.trim().toUpperCase(),
    description_internal:   input.description_internal.trim() || null,
    type:                   input.type,
    value:                  input.type === "free_shipping" ? 0 : parseFloat(input.value) || 0,
    is_active:              input.is_active,
    start_date:             input.start_date || null,
    expiration_date:        input.expiration_date || null,
    max_uses_total:         input.max_uses_total.trim() ? parseInt(input.max_uses_total, 10) : null,
    max_uses_per_customer:  input.max_uses_per_customer.trim() ? parseInt(input.max_uses_per_customer, 10) : null,
    min_order_value:        input.min_order_value.trim() ? parseFloat(input.min_order_value) : null,
  };
}

// ── CRUD Actions ──────────────────────────────────────────────────────────────
export async function listCoupons(): Promise<AdminCoupon[]> {
  await requireAdmin(); // leitura — qualquer papel autenticado, inclusive viewer
  const service = createServiceClient();
  const { data, error } = await service
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminCoupon[];
}

export async function createCoupon(
  input: CouponFormInput
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const err = validate(input);
  if (err) return { error: err };

  const service = createServiceClient();
  const { error } = await service.from("coupons").insert(toDbPayload(input));
  if (error) {
    if (error.code === "23505") return { error: "Já existe um cupom com esse código." };
    return { error: error.message };
  }

  revalidatePath("/admin/cupons");
  return {};
}

export async function updateCoupon(
  id: string,
  input: CouponFormInput
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const err = validate(input);
  if (err) return { error: err };

  const service = createServiceClient();
  const { error } = await service.from("coupons").update(toDbPayload(input)).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Já existe um cupom com esse código." };
    return { error: error.message };
  }

  revalidatePath("/admin/cupons");
  return {};
}

export async function deleteCoupon(id: string): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();
  const { error } = await service.from("coupons").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/cupons");
  return {};
}

export async function toggleCouponActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();
  const { error } = await service
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/cupons");
  return {};
}

// ── Public coupon validation (cart page, no auth required) ───────────────────
export interface ValidateCouponResult {
  valid: true;
  type: CouponType;
  discount: number;
  description: string;
}

export async function validateCouponPublic(
  code: string,
  subtotal: number,
  shippingValue: number
): Promise<ValidateCouponResult | { valid: false; error: string }> {
  if (!code.trim()) return { valid: false, error: "Digite um código de cupom." };

  const service = createServiceClient();
  const { data: coupon, error } = await service
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (error || !coupon) return { valid: false, error: "Cupom não encontrado." };
  if (!coupon.is_active)  return { valid: false, error: "Este cupom está inativo." };

  // Comparação por string YYYY-MM-DD é independente de timezone do servidor.
  // Validade: válido até o FIM do dia selecionado (expiration_date >= today).
  const todayStr = new Date().toISOString().split("T")[0];
  if (coupon.start_date && coupon.start_date > todayStr)
    return { valid: false, error: "Este cupom ainda não está válido." };
  if (coupon.expiration_date && coupon.expiration_date < todayStr)
    return { valid: false, error: "Este cupom expirou." };
  // Validação do pedido mínimo ANTES de qualquer cálculo de desconto.
  const minOrderValue = Number(coupon.min_order_value ?? 0);
  if (minOrderValue > 0 && subtotal < minOrderValue) {
    return {
      valid: false,
      error: `Este cupom exige pedido mínimo de ${formatCurrency(minOrderValue)}. Seu subtotal atual é ${formatCurrency(subtotal)}.`,
    };
  }

  if (coupon.max_uses_total !== null && coupon.uses_count >= coupon.max_uses_total)
    return { valid: false, error: "Este cupom atingiu o limite de usos." };

  let discount = 0;
  let description = "";
  if (coupon.type === "percentage") {
    discount = (subtotal * Number(coupon.value)) / 100;
    description = `${coupon.value}% de desconto`;
  } else if (coupon.type === "fixed") {
    // Aplica exatamente o valor do desconto. Math.max(0, ...) previne desconto maior que o subtotal.
    discount = Math.min(Number(coupon.value), subtotal);
    description = `R$ ${Number(coupon.value).toFixed(2)} de desconto`;
  } else if (coupon.type === "free_shipping") {
    discount = shippingValue;
    description = "Frete grátis";
  }

  return {
    valid:       true,
    type:        coupon.type as CouponType,
    discount:    Number(discount.toFixed(2)),
    description,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// ── Usage history ─────────────────────────────────────────────────────────────
export async function getCouponUsages(
  couponId: string
): Promise<CouponUsageRow[]> {
  await requireAdmin(); // leitura — qualquer papel autenticado, inclusive viewer
  const service = createServiceClient();

  const { data, error } = await service
    .from("coupon_usages")
    .select(`
      id,
      coupon_id,
      order_id,
      customer_email,
      discount_applied,
      created_at,
      orders (
        order_number,
        customer_name,
        subtotal,
        total,
        status
      )
    `)
    .eq("coupon_id", couponId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as {
      id: string;
      coupon_id: string;
      order_id: string;
      customer_email: string;
      discount_applied: number;
      created_at: string;
      orders: {
        order_number: string;
        customer_name: string;
        subtotal: number;
        total: number;
        status: string;
      } | null;
    };
    return {
      id:               r.id,
      coupon_id:        r.coupon_id,
      order_id:         r.order_id,
      customer_email:   r.customer_email,
      discount_applied: Number(r.discount_applied),
      created_at:       r.created_at,
      order_number:     r.orders?.order_number ?? "—",
      customer_name:    r.orders?.customer_name ?? "—",
      order_subtotal:   Number(r.orders?.subtotal ?? 0),
      order_total:      Number(r.orders?.total ?? 0),
      order_status:     r.orders?.status ?? "—",
    };
  });
}
