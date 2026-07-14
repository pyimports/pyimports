"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { SearchInput } from "@/components/common/SearchInput";
import { Select } from "@/components/common/Select";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { updateOrderStatus } from "@/lib/actions/orders";
import { routes } from "@/lib/routes";
import { ORDER_STATUS_LABELS } from "@/types";
import type { OrderStatus } from "@/types";
import type { AdminOrder } from "@/lib/db/orders";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pending_payment",      label: ORDER_STATUS_LABELS.pending_payment },
  { value: "payment_confirmed",    label: ORDER_STATUS_LABELS.payment_confirmed },
  { value: "awaiting_validation",  label: ORDER_STATUS_LABELS.awaiting_validation },
  { value: "awaiting_separation",  label: ORDER_STATUS_LABELS.awaiting_separation },
  { value: "shipped",              label: ORDER_STATUS_LABELS.shipped },
  { value: "delivered",            label: ORDER_STATUS_LABELS.delivered },
  { value: "cancelled",            label: ORDER_STATUS_LABELS.cancelled },
];

interface Props {
  initialOrders: AdminOrder[];
}

export function PedidosClient({ initialOrders }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = initialOrders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q);
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = (orderId: string) => async (newStatus: OrderStatus) => {
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Pedidos</h1>
        <p className="text-sm text-muted mt-1">
          {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por pedido, cliente ou e-mail..."
          className="flex-1"
        />
        <div className="w-full sm:w-52">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Filtrar status"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-alt">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Itens</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-dark-border last:border-0 hover:bg-dark-hover transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-dark-text">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-dark-text">{order.customer_name}</div>
                    <div className="text-xs text-muted">{order.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {order.item_count} {order.item_count === 1 ? "item" : "itens"}
                  </td>
                  <td className="px-4 py-3 font-bold text-accent whitespace-nowrap">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect
                      currentStatus={order.status}
                      onStatusChange={handleStatusChange(order.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={routes.admin.pedido(order.id)}>
                      <button className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors">
                        <Eye size={14} />
                        Ver
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
