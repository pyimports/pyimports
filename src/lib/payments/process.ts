import { createServiceClient } from "@/lib/supabase/server";
import { transitionOrderStatus } from "@/lib/orders/transition";
import type { PaymentVerificationStatus } from "./types";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface ProcessPaymentResultInput {
  service: ServiceClient;
  orderId: string;
  status: PaymentVerificationStatus;
  paidAt?: string;
}

// Única função que decide "o que fazer quando sabemos o resultado real de um
// pagamento" — chamada pelo webhook (depois de verificar com o gateway) e
// pelo dev-confirm (que simula um webhook aprovado). Nunca decrementa estoque
// diretamente: isso já é feito pelo trigger record_inventory_movement,
// disparado automaticamente pelo update de orders.payment_status.
export async function processPaymentResult({
  service,
  orderId,
  status,
  paidAt,
}: ProcessPaymentResultInput): Promise<{ error?: string }> {
  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, status, payment_status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return { error: "Pedido não encontrado." };

  if (status === "approved") {
    if (order.payment_status === "confirmed") return {}; // já processado

    const { error: paymentError } = await service
      .from("payments")
      .update({ status: "confirmed", paid_at: paidAt ?? new Date().toISOString() })
      .eq("order_id", orderId);
    if (paymentError) return { error: paymentError.message };

    // Dispara trg_update_customer_metrics e trg_inventory_on_order (baixa de
    // estoque atômica, já trata variantes) — ambos triggers existentes.
    const { error: confirmError } = await service
      .from("orders")
      .update({ payment_status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (confirmError) return { error: confirmError.message };

    return transitionOrderStatus(service, orderId, "payment_confirmed", "webhook", "Pagamento aprovado pelo gateway");
  }

  if (status === "rejected" || status === "cancelled") {
    await service.from("payments").update({ status: "failed" }).eq("order_id", orderId);

    if (order.status === "pending_payment") {
      return transitionOrderStatus(service, orderId, "cancelled", "webhook", "Pagamento rejeitado pelo gateway");
    }
  }

  return {};
}
