"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminWrite } from "@/lib/auth/admin-guard";
import { transitionOrderStatus } from "@/lib/orders/transition";
import { processPaymentResult } from "@/lib/payments/process";
import type { OrderStatus } from "@/types";

// ---------------------------------------------------------------------------
// updateOrderStatus
// Valida a transição, atualiza o pedido, registra o histórico e cria notificação.
// ---------------------------------------------------------------------------

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();

  const result = await transitionOrderStatus(service, orderId, newStatus, "admin", notes);
  if (result.error) return result;

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/dashboard");

  return {};
}

// ---------------------------------------------------------------------------
// confirmManualPayment
// Usada no fluxo PAYMENT_MODE === "manual" (ver src/lib/payments/mode.ts):
// o admin confirma que recebeu o pagamento por fora (link enviado pelo
// WhatsApp) depois de conferir nome + ID do pedido mandados pelo cliente.
// Reaproveita processPaymentResult — a mesma função usada por webhook real e
// por dev-confirm — pra garantir que payments.status, orders.payment_status
// e a transição pra "payment_confirmed" (com baixa de estoque via trigger)
// aconteçam exatamente como aconteceriam com um gateway automático.
// ---------------------------------------------------------------------------

export async function confirmManualPayment(orderId: string): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();

  const result = await processPaymentResult({
    service,
    orderId,
    status: "approved",
    paidAt: new Date().toISOString(),
  });
  if (result.error) return result;

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/dashboard");

  return {};
}

// ---------------------------------------------------------------------------
// updateOrderInternalNotes
// Salva anotações internas do pedido (visíveis apenas para admins).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// updateOrderTracking
// Salva código/link de rastreio — usado pela tela pública "Acompanhar Pedido"
// pra mostrar o botão "Acompanhar rastreio" e/ou o código da transportadora.
// ---------------------------------------------------------------------------

export async function updateOrderTracking(
  orderId: string,
  trackingCode: string,
  trackingUrl: string
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();

  const { error } = await service
    .from("orders")
    .update({
      tracking_code: trackingCode.trim() || null,
      tracking_url: trackingUrl.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/pedidos/${orderId}`);
  return {};
}

export async function updateOrderInternalNotes(
  orderId: string,
  notes: string
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();

  const { error } = await service
    .from("orders")
    .update({ internal_notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/pedidos/${orderId}`);
  return {};
}
