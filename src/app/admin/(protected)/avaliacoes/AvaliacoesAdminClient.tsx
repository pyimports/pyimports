"use client";

import React, { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Star, Check, X, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { formatDateShort } from "@/lib/formatters";
import {
  approveCustomerReview,
  rejectCustomerReview,
  deleteCustomerReview,
  type AdminCustomerReview,
} from "@/lib/actions/customer-reviews";
import type { CustomerReviewStatus, ServiceRating } from "@/types";

interface Props {
  initialReviews: AdminCustomerReview[];
}

const STATUS_TABS: { value: CustomerReviewStatus; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Rejeitadas" },
];

const STATUS_BADGE: Record<CustomerReviewStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<CustomerReviewStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

const SERVICE_RATING_LABEL: Record<ServiceRating, string> = {
  pessimo: "Péssimo",
  ruim: "Ruim",
  bom: "Bom",
  excelente: "Excelente",
};

const SERVICE_RATING_BADGE: Record<ServiceRating, "danger" | "warning" | "info" | "success"> = {
  pessimo: "danger",
  ruim: "warning",
  bom: "info",
  excelente: "success",
};

export function AvaliacoesAdminClient({ initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [tab, setTab] = useState<CustomerReviewStatus>("pending");
  const [, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<CustomerReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of reviews) c[r.status]++;
    return c;
  }, [reviews]);

  const filtered = reviews.filter((r) => r.status === tab);

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveCustomerReview(id);
      if ("error" in result) { alert(result.error); return; }
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      const result = await rejectCustomerReview(id);
      if ("error" in result) { alert(result.error); return; }
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    });
  };

  const handleDelete = (id: string, customerName: string) => {
    if (!confirm(`Excluir a avaliação de "${customerName}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteCustomerReview(id);
      if ("error" in result) { alert(result.error); return; }
      setReviews((prev) => prev.filter((r) => r.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Avaliações de clientes</h1>
        <p className="text-sm text-muted mt-1">
          Avaliações enviadas pelos clientes, vinculadas a pedidos reais — aprove antes de aparecerem
          publicamente em &quot;Avaliações&quot;.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-dark-border">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={[
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.value
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-dark-text",
            ].join(" ")}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-12 text-center text-muted text-sm">
          Nenhuma avaliação {STATUS_LABEL[tab].toLowerCase()} no momento.
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.id} className="bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-dark-text">{r.customer_name}</span>
                  <Badge label={STATUS_LABEL[r.status]} variant={STATUS_BADGE[r.status]} size="sm" />
                  <Badge
                    label={SERVICE_RATING_LABEL[r.service_rating]}
                    variant={SERVICE_RATING_BADGE[r.service_rating]}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-muted mt-1">
                  Pedido #{r.order_number} · CPF {r.customer_cpf} · comprou em {formatDateShort(r.purchase_date)} ·
                  entregue em {formatDateShort(r.delivery_date)}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={16} className={n <= r.rating ? "fill-accent text-accent" : "text-dark-border"} />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted">
              <Package size={14} className="flex-shrink-0 mt-0.5" />
              <span>{r.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}</span>
            </div>

            <p className="text-sm text-dark-text leading-relaxed">{r.description}</p>

            {r.images.length > 0 && (
              <div className="flex items-center gap-2">
                {r.images.map((url) => (
                  <button
                    key={url}
                    onClick={() => setLightbox(url)}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-border flex-shrink-0"
                  >
                    <Image src={url} alt="Foto da avaliação" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              {r.status !== "approved" && (
                <button
                  onClick={() => handleApprove(r.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-success hover:text-success/80 transition-colors"
                >
                  <Check size={14} /> Aprovar
                </button>
              )}
              {r.status !== "rejected" && (
                <button
                  onClick={() => handleReject(r.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-warning hover:text-warning/80 transition-colors"
                >
                  <X size={14} /> Rejeitar
                </button>
              )}
              <button
                onClick={() => handleDelete(r.id, r.customer_name)}
                className="flex items-center gap-1.5 text-xs font-medium text-danger hover:text-danger/80 transition-colors ml-auto"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh] w-full aspect-square">
            <Image src={lightbox} alt="Foto da avaliação" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}
