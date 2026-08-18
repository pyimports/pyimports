"use client";

import React, { useState } from "react";
import { Star, X, ImagePlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Input, Textarea } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { createManualCustomerReview } from "@/lib/actions/customer-reviews";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const MAX_IMAGES = 4;

export function ManualReviewModal({ onClose, onCreated }: Props) {
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommends, setRecommends] = useState<boolean | null>(null);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    orderNumber.trim() &&
    customerName.trim() &&
    rating > 0 &&
    recommends !== null &&
    purchaseDate &&
    deliveryDate &&
    description.trim().length > 0;

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)].slice(0, MAX_IMAGES));
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setError("");
    setSubmitting(true);

    try {
      const imageUrls: string[] = [];
      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/reviews/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha ao enviar imagem.");
        imageUrls.push(data.url);
      }

      const result = await createManualCustomerReview({
        orderNumber,
        customerName,
        productName: productName || undefined,
        rating,
        recommends: recommends as boolean,
        purchaseDate,
        deliveryDate,
        description,
        images: imageUrls,
      });

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a avaliação.");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen title="Nova avaliação manual" onClose={onClose} size="xl">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Cria uma avaliação sem vínculo com nenhum pedido do sistema — 100% preenchida por você. Entra
          já aprovada, direto na página pública.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data da compra"
            type="date"
            required
            value={purchaseDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <Input
            label="Data de entrega"
            type="date"
            required
            value={deliveryDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDeliveryDate(e.target.value)}
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
            {images.map((file, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
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
            Criar avaliação
          </Button>
        </div>
      </div>
    </Modal>
  );
}
