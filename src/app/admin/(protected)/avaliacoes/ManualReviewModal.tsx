"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, X, ImagePlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Input, Textarea } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import {
  createManualCustomerReview,
  updateManualCustomerReview,
  type AdminCustomerReview,
} from "@/lib/actions/customer-reviews";
import { brasiliaDateKey, brasiliaToday } from "@/lib/timezone";

interface Props {
  review?: AdminCustomerReview; // presente = modo edição
  onClose: () => void;
  onSaved: () => void;
}

const MAX_IMAGES = 4;

// Converte o timestamp salvo (UTC) pra "YYYY-MM-DD" no calendário de
// Brasília, pra pré-preencher o <input type="date"> com o dia certo.
const toDateInput = (iso: string) => brasiliaDateKey(iso);

export function ManualReviewModal({ review, onClose, onSaved }: Props) {
  const isEditing = !!review;

  const [orderNumber, setOrderNumber] = useState(review?.order_number ?? "");
  const [customerName, setCustomerName] = useState(review?.customer_name ?? "");
  const [productName, setProductName] = useState(review?.products[0]?.name ?? "");
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommends, setRecommends] = useState<boolean | null>(review?.recommends ?? null);
  const [purchaseDate, setPurchaseDate] = useState(review ? toDateInput(review.purchase_date) : "");
  const [deliveryDate, setDeliveryDate] = useState(review ? toDateInput(review.delivery_date) : "");
  const [publishedAt, setPublishedAt] = useState(
    review ? toDateInput(review.created_at) : brasiliaToday()
  );
  const [description, setDescription] = useState(review?.description ?? "");
  const [existingImages, setExistingImages] = useState<string[]>(review?.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalImages = existingImages.length + newImages.length;

  const isValid =
    orderNumber.trim() &&
    customerName.trim() &&
    rating > 0 &&
    recommends !== null &&
    purchaseDate &&
    deliveryDate &&
    publishedAt &&
    description.trim().length > 0;

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    setNewImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_IMAGES - existingImages.length));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setError("");
    setSubmitting(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of newImages) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/reviews/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao enviar imagem.");
        uploadedUrls.push(data.url);
      }

      const payload = {
        orderNumber,
        customerName,
        productName: productName || undefined,
        rating,
        recommends: recommends as boolean,
        purchaseDate,
        deliveryDate,
        publishedAt,
        description,
        images: [...existingImages, ...uploadedUrls],
      };

      const result = isEditing
        ? await updateManualCustomerReview(review.id, payload)
        : await createManualCustomerReview(payload);

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a avaliação.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen title={isEditing ? "Editar avaliação manual" : "Nova avaliação manual"} onClose={onClose} size="xl">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          {isEditing
            ? "Edita uma avaliação manual — sem vínculo com nenhum pedido do sistema."
            : "Cria uma avaliação sem vínculo com nenhum pedido do sistema — 100% preenchida por você. Entra já aprovada, direto na página pública."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Número do pedido"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="PY00000"
          />
          <Input
            label="Nome do cliente"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome completo"
          />
        </div>

        <Input
          label="Produto(s) comprado(s)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Ex.: Tirzepatida 30mg (opcional)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Data da compra"
            type="date"
            required
            value={purchaseDate}
            max={brasiliaToday()}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <Input
            label="Data de entrega"
            type="date"
            required
            value={deliveryDate}
            max={brasiliaToday()}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
          <Input
            label="Data de publicação"
            type="date"
            required
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            helper="Data que aparece no card da avaliação"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text mb-1.5">
            Nota <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
              >
                <Star
                  size={26}
                  className={n <= (hoverRating || rating) ? "fill-accent text-accent" : "text-dark-border"}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text mb-1.5">
            Recomenda? <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRecommends(true)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                recommends === true
                  ? "border-success bg-success/10 text-success"
                  : "border-dark-border-light text-muted hover:border-success/40",
              ].join(" ")}
            >
              <ThumbsUp size={15} /> Sim
            </button>
            <button
              type="button"
              onClick={() => setRecommends(false)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                recommends === false
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-dark-border-light text-muted hover:border-danger/40",
              ].join(" ")}
            >
              <ThumbsDown size={15} /> Não
            </button>
          </div>
        </div>

        <Textarea
          label="Descrição"
          required
          counter
          maxLength={1500}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que o cliente disse sobre a compra..."
        />

        <div>
          <label className="block text-sm font-medium text-dark-text mb-1.5">
            Fotos (opcional, até {MAX_IMAGES})
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {existingImages.map((url, i) => (
              <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-border">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
                <button
                  onClick={() => handleRemoveExistingImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {newImages.map((file, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveNewImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {totalImages < MAX_IMAGES && (
              <label className="w-16 h-16 rounded-lg border border-dashed border-dark-border-light flex items-center justify-center cursor-pointer hover:border-accent/50 transition-colors">
                <ImagePlus size={18} className="text-muted" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddImages(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="accent" isLoading={submitting} disabled={!isValid} onClick={handleSubmit}>
            {isEditing ? "Salvar alterações" : "Criar avaliação"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
