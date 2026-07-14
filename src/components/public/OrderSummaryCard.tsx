import React from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { OrderStatus } from "@/types";
import type { PublicOrderDetail } from "@/lib/actions/order-lookup";

function actionLabel(status: OrderStatus): string {
  if (status === "shipped") return "Acompanhar rastreio";
  if (status === "delivered" || status === "cancelled") return "Ver detalhes";
  return "Acompanhar pedido";
}

interface Props {
  order: PublicOrderDetail;
  onSelect: () => void;
}

export function OrderSummaryCard({ order, onSelect }: Props) {
  return (
    <div className="bg-dark-surface rounded-2xl border border-dark-border p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <p className="font-bold font-mono text-dark-text">{order.order_number}</p>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <p className="text-xs text-muted">
          {formatDate(order.created_at)} · {order.items.length} {order.items.length === 1 ? "item" : "itens"}
        </p>
        <p className="text-sm font-semibold text-accent mt-1">{formatCurrency(order.total)}</p>
      </div>
      <Button variant="outline" size="sm" rightIcon={<ChevronRight size={14} />} onClick={onSelect}>
        {actionLabel(order.status)}
      </Button>
    </div>
  );
}
