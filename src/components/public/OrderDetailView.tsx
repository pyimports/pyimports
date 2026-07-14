"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Package, Truck, MessageCircle, Copy, Check, ImageIcon } from "lucide-react";
import { OrderStatusTimeline } from "@/components/public/OrderStatusTimeline";
import { Button } from "@/components/common/Button";
import { StatusBadge, Badge } from "@/components/common/Badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { generateOrderWhatsAppLink } from "@/lib/whatsapp";
import type { OrderStatus } from "@/types";
import type { PublicOrderDetail } from "@/lib/actions/order-lookup";

function statusMessage(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return "Seu pedido foi recebido, mas ainda estamos aguardando a confirmação do pagamento.";
    case "payment_confirmed":
    case "awaiting_validation":
    case "awaiting_separation":
      return "Pagamento aprovado. Estamos preparando seu pedido.";
    case "shipped":
      return "Seu pedido foi enviado. Acompanhe pelo código de rastreio abaixo.";
    case "delivered":
      return "Seu pedido foi entregue. Esperamos que você ame a sua compra!";
    case "cancelled":
      return "Este pedido foi cancelado.";
    default:
      return "";
  }
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  failed: "Falhou",
  refunded: "Estornado",
  pending: "Pendente",
};

const PAYMENT_STATUS_VARIANT: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  confirmed: "success",
  failed: "danger",
  refunded: "warning",
  pending: "neutral",
};

interface Props {
  order: PublicOrderDetail;
}

export function OrderDetailView({ order }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponível — sem feedback, não é crítico
    }
  };

  const hasTracking = !!(order.tracking_code || order.tracking_url);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cabeçalho */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted mb-1">Pedido</p>
            <div className="flex items-center gap-2">
              <p className="font-bold font-mono text-dark-text text-lg">{order.order_number}</p>
              <button
                onClick={handleCopy}
                title="Copiar número do pedido"
                className="text-muted hover:text-accent transition-colors p-1"
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-xs text-muted mt-1">{formatDate(order.created_at)}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={order.status} />
            <p className="text-lg font-bold text-accent mt-2">{formatCurrency(order.total)}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-6">
        <h2 className="text-sm font-bold text-dark-text mb-4">Status do pedido</h2>
        <OrderStatusTimeline currentStatus={order.status} history={order.status_history} />
      </div>

      {/* Entrega / rastreio */}
      {order.status !== "cancelled" && (
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-3">
          <h2 className="text-sm font-bold text-dark-text flex items-center gap-2">
            <Package size={15} className="text-accent" />
            Entrega
          </h2>
          <p className="text-sm text-muted">{statusMessage(order.status)}</p>
          <p className="text-xs text-muted">
            Destino: {order.shipping_neighborhood}, {order.shipping_city}/{order.shipping_state}
            {order.shipping_service && ` · ${order.shipping_service}`}
          </p>

          {hasTracking ? (
            <div className="space-y-2 pt-1">
              {order.tracking_code && (
                <div className="flex items-center justify-between bg-dark-alt rounded-xl px-3 py-2.5">
                  <span className="text-xs text-muted">Código de rastreio</span>
                  <span className="text-sm font-mono text-dark-text">{order.tracking_code}</span>
                </div>
              )}
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="accent" fullWidth leftIcon={<Truck size={14} />}>
                    Acompanhar rastreio
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted bg-dark-alt/60 rounded-xl px-3 py-2.5">
              Seu pedido ainda não recebeu código de rastreio. Assim que for enviado, essa área será atualizada.
            </p>
          )}
        </div>
      )}

      {/* Itens */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-6">
        <h2 className="text-sm font-bold text-dark-text mb-3">Produtos</h2>
        <div className="space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 border-b border-dark-border last:border-0">
              <div className="w-12 h-12 rounded-lg bg-dark-alt border border-dark-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.product_image ? (
                  <Image src={item.product_image} alt={item.product_name} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <ImageIcon size={16} className="text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-text truncate">{item.product_name}</p>
                {item.variant_color_name && item.variant_size && (
                  <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                    {item.variant_color_hex && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.variant_color_hex }} />
                    )}
                    {item.variant_color_name} · {item.variant_size}
                  </p>
                )}
                <p className="text-xs text-muted mt-0.5">Qtd: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-accent flex-shrink-0">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>

        {/* Financeiro */}
        <div className="border-t border-dark-border mt-3 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-dark-text">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.coupon_discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Cupom</span>
              <span className="text-success">-{formatCurrency(order.coupon_discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted">Frete</span>
            <span className="text-dark-text">{order.shipping_value === 0 ? "Grátis" : formatCurrency(order.shipping_value)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1">
            <span className="text-dark-text">Total</span>
            <span className="text-accent text-lg">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-2">
        <h2 className="text-sm font-bold text-dark-text mb-1">Pagamento</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Forma de pagamento</span>
          <span className="text-dark-text">{order.payment_method === "pix" ? "Pix" : "Cartão"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Status do pagamento</span>
          <Badge
            variant={PAYMENT_STATUS_VARIANT[order.payment_status] ?? "neutral"}
            label={PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
            size="sm"
          />
        </div>
      </div>

      {/* Dados de contato (mascarados) */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-1">
        <h2 className="text-sm font-bold text-dark-text mb-2">Dados da compra</h2>
        <p className="text-sm text-dark-text">{order.customer_name}</p>
        <p className="text-xs text-muted">{order.customer_email_masked}</p>
        {order.customer_phone_masked && <p className="text-xs text-muted">{order.customer_phone_masked}</p>}
      </div>

      {/* Ações */}
      <a
        href={generateOrderWhatsAppLink({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          items: order.items.map((i) => ({ name: i.product_name, quantity: i.quantity })),
          total: order.total,
        })}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button variant="secondary" fullWidth leftIcon={<MessageCircle size={14} />}>
          Falar no WhatsApp
        </Button>
      </a>
    </div>
  );
}
