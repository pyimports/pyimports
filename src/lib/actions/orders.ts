"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { transitionOrderStatus } from "@/lib/orders/transition";
import type { OrderStatus } from "@/types";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Não autorizado");
  return service;
}

// ---------------------------------------------------------------------------
// updateOrderStatus
// Valida a transição, atualiza o pedido, registra o histórico e cria notificação.
// ---------------------------------------------------------------------------

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
): Promise<{ error?: string }> {
  let service: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    service = await requireAdmin();
  } catch {
    return { error: "Não autorizado" };
  }

  const result = await transitionOrderStatus(service, orderId, newStatus, "admin", notes);
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
  let service: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    service = await requireAdmin();
  } catch {
    return { error: "Não autorizado" };
  }

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
  let service: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    service = await requireAdmin();
  } catch {
    return { error: "Não autorizado" };
  }

  const { error } = await service
    .from("orders")
    .update({ internal_notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/pedidos/${orderId}`);
  return {};
}
