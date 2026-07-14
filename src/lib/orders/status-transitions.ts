import type { OrderStatus } from "@/types";

// Módulo puro (sem imports de servidor) — pode ser usado tanto no client
// (OrderStatusSelect, pra saber quais opções mostrar no dropdown) quanto no
// server (transitionOrderStatus, pra validar a transição antes de gravar).
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment:      ["payment_confirmed", "cancelled"],
  payment_confirmed:    ["awaiting_validation", "awaiting_separation", "cancelled"],
  awaiting_validation:  ["awaiting_separation", "cancelled"],
  awaiting_separation:  ["shipped", "cancelled"],
  shipped:              ["delivered"],
  delivered:            [],
  cancelled:            [],
};
