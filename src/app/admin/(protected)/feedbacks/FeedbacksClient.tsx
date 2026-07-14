"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Edit2, GripVertical, Trash2, Star, Play } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Toggle } from "@/components/common/Toggle";
import { FeedbackModal } from "./FeedbackModal";
import { toggleReviewActive, deleteReview, reorderReviews } from "@/lib/actions/reviews";
import { formatStateName } from "@/lib/formatters";
import type { Review } from "@/types";

interface Props {
  initialReviews: Review[];
  productOptions: { value: string; label: string }[];
}

export function FeedbacksClient({ initialReviews, productOptions }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [, startTransition] = useTransition();
  const [modalReview, setModalReview] = useState<Review | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleToggle = (id: string, current: boolean) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: !current } : r)));
    startTransition(async () => {
      await toggleReviewActive(id, !current);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir o feedback de "${name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteReview(id);
      if (result.error) { alert(result.error); return; }
      setReviews((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const openCreate = () => { setModalReview(undefined); setModalOpen(true); };
  const openEdit = (r: Review) => { setModalReview(r); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); window.location.reload(); };

  // Reordenação via drag-and-drop nativo
  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setReviews((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    startTransition(async () => {
      await reorderReviews(reviews.map((r) => r.id));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Feedbacks</h1>
          <p className="text-sm text-muted mt-1">
            {reviews.length} depoimento{reviews.length !== 1 ? "s" : ""} cadastrado{reviews.length !== 1 ? "s" : ""} ·
            arraste para reordenar
          </p>
        </div>
        <Button variant="accent" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Novo feedback
        </Button>
      </div>

      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-dark-alt">
              <th className="w-8" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                Cliente
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">
                Avaliação
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                Ativo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                  Nenhum feedback cadastrado.
                </td>
              </tr>
            )}
            {reviews.map((r, i) => (
              <tr
                key={r.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(i); }}
                onDragEnd={handleDragEnd}
                className={`border-b border-dark-border last:border-0 hover:bg-dark-hover transition-colors ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <td className="px-3 py-3 text-muted cursor-grab active:cursor-grabbing">
                  <GripVertical size={14} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.image_url ? (
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={r.image_url} alt={r.customer_name} fill className="object-cover" unoptimized />
                      </div>
                    ) : r.video_url ? (
                      <div className="w-8 h-8 rounded-lg bg-dark-alt flex items-center justify-center flex-shrink-0">
                        <Play size={12} className="text-accent" />
                      </div>
                    ) : null}
                    <div>
                      <div className="text-sm font-medium text-dark-text">{r.customer_name}</div>
                      <div className="text-xs text-muted line-clamp-1 max-w-[220px]">{r.comment}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={n <= r.rating ? "fill-accent text-accent" : "text-dark-border"}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted hidden md:table-cell">{formatStateName(r.state)}</td>
                <td className="px-4 py-3">
                  <Toggle checked={r.is_active} onChange={() => handleToggle(r.id, r.is_active)} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(r)}
                      className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
                    >
                      <Edit2 size={13} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.customer_name)}
                      className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FeedbackModal review={modalReview} productOptions={productOptions} onClose={closeModal} />
      )}
    </div>
  );
}
