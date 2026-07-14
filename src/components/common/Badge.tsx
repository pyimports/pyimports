import React from "react";
import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";

type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "gold"
  | "discount";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-success-bg text-success border border-success/20",
  danger: "bg-danger-bg text-danger border border-danger/20",
  warning: "bg-warning-bg text-warning border border-warning/20",
  info: "bg-info-bg text-info border border-info/20",
  neutral: "bg-dark-alt text-muted border border-dark-border-light",
  gold: "bg-accent-dim text-accent border border-accent/30",
  discount: "bg-white text-danger font-extrabold shadow-lg shadow-black/30 ring-1 ring-black/5",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-muted",
  gold: "bg-accent",
  discount: "bg-danger",
};

export const Badge = ({
  label,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) => (
  <span
    className={[
      "inline-flex items-center gap-1.5 font-medium rounded-full",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {dot && (
      <span
        className={`inline-block rounded-full ${dotColors[variant]} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}`}
      />
    )}
    {label}
  </span>
);

// Badge especializado para status de pedido
export const StatusBadge = ({
  status,
  size = "md",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) => (
  <Badge
    label={ORDER_STATUS_LABELS[status]}
    variant={ORDER_STATUS_COLORS[status]}
    size={size}
    dot
  />
);

// Badge de cliente
export const CustomerBadge = ({
  isVip,
  totalOrders,
  firstOrderAt,
}: {
  isVip: boolean;
  totalOrders: number;
  firstOrderAt?: string;
}) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isNew =
    firstOrderAt && new Date(firstOrderAt) > thirtyDaysAgo && totalOrders === 1;
  const isRecurring = totalOrders >= 2;

  if (isVip)
    return <Badge label="VIP" variant="gold" size="sm" dot />;
  if (isNew)
    return <Badge label="Novo cliente" variant="success" size="sm" dot />;
  if (isRecurring)
    return <Badge label="Recorrente" variant="info" size="sm" dot />;
  return null;
};
