import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { OrderStatus, OrderStatusHistory } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { formatDateTime } from "@/lib/formatters";

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "payment_confirmed",
  "awaiting_separation",
  "shipped",
  "delivered",
];

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  history?: OrderStatusHistory[];
}

export const OrderStatusTimeline = ({
  currentStatus,
  history = [],
}: OrderStatusTimelineProps) => {
  if (currentStatus === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-danger-bg border border-danger/20 rounded-xl">
        <div className="w-8 h-8 bg-danger-bg border border-danger/30 rounded-full flex items-center justify-center">
          <span className="text-danger text-lg">✕</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-danger">Pedido cancelado</div>
          {history.find((h) => h.new_status === "cancelled") && (
            <div className="text-xs text-muted mt-0.5">
              {formatDateTime(history.find((h) => h.new_status === "cancelled")!.created_at)}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {STATUS_ORDER.map((status, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const historyEntry = history.find((h) => h.new_status === status);

        return (
          <div key={status} className="flex gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  isCompleted
                    ? "bg-success/10 border-success"
                    : isCurrent
                    ? "bg-accent/10 border-accent"
                    : "bg-dark-alt border-dark-border-light",
                ].join(" ")}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : isCurrent ? (
                  <Loader2 size={14} className="text-accent animate-spin" />
                ) : (
                  <Circle size={14} className="text-muted" />
                )}
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={[
                    "w-0.5 flex-1 my-1",
                    isCompleted ? "bg-success/30" : "bg-dark-border",
                  ].join(" ")}
                  style={{ minHeight: "20px" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 flex-1 min-w-0">
              <div
                className={[
                  "text-sm font-medium",
                  isCompleted
                    ? "text-success"
                    : isCurrent
                    ? "text-accent"
                    : "text-muted",
                ].join(" ")}
              >
                {ORDER_STATUS_LABELS[status]}
              </div>
              {historyEntry && (
                <div className="text-xs text-muted mt-0.5">
                  {formatDateTime(historyEntry.created_at)}
                  {historyEntry.notes && (
                    <span className="ml-2 text-dark-text/70">{historyEntry.notes}</span>
                  )}
                </div>
              )}
              {isCurrent && !historyEntry && (
                <div className="text-xs text-muted mt-0.5">Em andamento</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
