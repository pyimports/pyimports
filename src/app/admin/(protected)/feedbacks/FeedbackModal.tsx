"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { X, Save, Loader2, Upload, Trash2, Star, AlertTriangle, ChevronDown } from "lucide-react";
import { Input, Textarea } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Toggle } from "@/components/common/Toggle";
import { Button } from "@/components/common/Button";
import { ImageFramingEditor } from "@/components/admin/ImageFramingEditor";
import { createReview, updateReview } from "@/lib/actions/reviews";
import { formatStateName } from "@/lib/formatters";
import type { ReviewFormData } from "@/lib/actions/reviews";
import type { Review } from "@/types";

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface Props {
  review?: Review;
  productOptions: { value: string; label: string }[];
  onClose: () => void;
}

export function FeedbackModal({ review, productOptions, onClose }: Props) {
  const isEdit = !!review;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(review?.customer_name ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [state, setState] = useState(review?.state ?? "");
  const [deliveryLabel, setDeliveryLabel] = useState(review?.delivery_days_label ?? "");
  const [comment, setComment] = useState(review?.comment ?? "");
  const [productIds, setProductIds] = useState<string[]>(review?.product_ids ?? []);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const [videoUrl, setVideoUrl] = useState(review?.video_url ?? "");
  const [isActive, setIsActive] = useState(review?.is_active ?? true);
  const [displayOrder, setDisplayOrder] = useState(review?.display_order?.toString() ?? "0");

  const [imageUrl, setImageUrl] = useState(review?.image_url ?? "");
  const [imagePath, setImagePath] = useState(review?.image_storage_path ?? "");
  const [imagePosX, setImagePosX] = useState(review?.image_object_position_x ?? 50);
  const [imagePosY, setImagePosY] = useState(review?.image_object_position_y ?? 50);
  const [imageScale, setImageScale] = useState(review?.image_scale ?? 1);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDragging, setImageDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Alterações não salvas — compara o estado atual com o que foi carregado ao
  // abrir o modal. Usado para confirmar antes de descartar (clique fora, X,
  // Cancelar ou Esc), já que perder um feedback inteiro digitado é frustrante.
  // ---------------------------------------------------------------------------
  const initialSnapshotRef = useRef(
    JSON.stringify({
      customerName: review?.customer_name ?? "",
      rating: review?.rating ?? 5,
      state: review?.state ?? "",
      deliveryLabel: review?.delivery_days_label ?? "",
      comment: review?.comment ?? "",
      productIds: review?.product_ids ?? [],
      videoUrl: review?.video_url ?? "",
      isActive: review?.is_active ?? true,
      displayOrder: review?.display_order?.toString() ?? "0",
      imageUrl: review?.image_url ?? "",
    })
  );

  const isDirty =
    JSON.stringify({
      customerName, rating, state, deliveryLabel: deliveryLabel, comment,
      productIds, videoUrl, isActive, displayOrder, imageUrl,
    }) !== initialSnapshotRef.current;

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    if (!productMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (productMenuRef.current && !productMenuRef.current.contains(e.target as Node)) {
        setProductMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [productMenuOpen]);

  const toggleProduct = (id: string) => {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleImageFile = async (file: File) => {
    setImageUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload-review", { method: "POST", body: fd });
    const json = await res.json() as { url?: string; storagePath?: string; error?: string };
    if (json.error || !json.url) {
      setError(json.error ?? "Erro ao fazer upload.");
    } else {
      setImageUrl(json.url);
      setImagePath(json.storagePath!);
      // Nova imagem — reseta o enquadramento da imagem anterior
      setImagePosX(50);
      setImagePosY(50);
      setImageScale(1);
    }
    setImageUploading(false);
  };

  const handleImageRemove = async () => {
    setImageUploading(true);
    if (imagePath) {
      await fetch(`/api/admin/upload-review?path=${encodeURIComponent(imagePath)}`, { method: "DELETE" });
    }
    setImageUrl("");
    setImagePath("");
    setImagePosX(50);
    setImagePosY(50);
    setImageScale(1);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setImageUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data: ReviewFormData = {
      customer_name: customerName,
      rating,
      state,
      delivery_days_label: deliveryLabel,
      comment,
      image_url: imageUrl || undefined,
      image_storage_path: imagePath || undefined,
      image_object_position_x: imagePosX,
      image_object_position_y: imagePosY,
      image_scale: imageScale,
      video_url: videoUrl || undefined,
      product_ids: productIds,
      is_active: isActive,
      display_order: parseInt(displayOrder) || 0,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateReview(review!.id, data)
        : await createReview(data);

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={requestClose} />

      <div className="relative w-full max-w-xl bg-dark-surface border border-dark-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-base font-bold text-dark-text">
            {isEdit ? "Editar feedback" : "Novo feedback"}
          </h2>
          <button
            onClick={requestClose}
            className="w-8 h-8 rounded-lg bg-dark-alt hover:bg-dark-hover border border-dark-border flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-muted" />
          </button>
        </div>

        {confirmDiscard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-dark-surface/98 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col items-center text-center gap-4 max-w-sm">
              <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center">
                <AlertTriangle size={26} className="text-warning" />
              </div>
              <div>
                <h3 className="text-base font-bold text-dark-text">Descartar alterações?</h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  Este feedback foi modificado e ainda não foi salvo. Se você sair agora, tudo o que foi preenchido será perdido.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-1">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDiscard(false)}>
                  Continuar editando
                </Button>
                <Button variant="danger" className="flex-1" onClick={onClose}>
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Nome do cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ex: Marina Souza"
            required
          />

          <div>
            <p className="text-sm font-medium text-dark-text mb-1.5">Avaliação</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-0.5"
                  aria-label={`${n} estrelas`}
                >
                  <Star
                    size={22}
                    className={n <= rating ? "fill-accent text-accent" : "text-dark-border"}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRating(0)}
                className="ml-2 text-xs text-muted hover:text-danger"
              >
                Zerar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={state}
              onChange={setState}
              options={BRAZIL_STATES.map((uf) => ({ value: uf, label: formatStateName(uf) }))}
              required
            />
            <Input
              label="Prazo de entrega"
              value={deliveryLabel}
              onChange={(e) => setDeliveryLabel(e.target.value)}
              placeholder='Ex: "Entregue em 3 dias"'
              required
            />
          </div>

          <Textarea
            label="Texto do feedback"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="O que o cliente disse sobre a compra"
            required
          />

          <div>
            <p className="text-sm font-medium text-dark-text mb-1.5">Produtos relacionados (opcional)</p>
            <div className="relative" ref={productMenuRef}>
              <button
                type="button"
                onClick={() => setProductMenuOpen((v) => !v)}
                className="w-full bg-dark-surface border border-dark-border-light rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between gap-2 hover:border-accent/40 transition-colors"
              >
                <span className={productIds.length ? "text-dark-text" : "text-muted"}>
                  {productIds.length === 0
                    ? "Nenhum produto vinculado"
                    : `${productIds.length} produto${productIds.length > 1 ? "s" : ""} selecionado${productIds.length > 1 ? "s" : ""}`}
                </span>
                <ChevronDown size={16} className="text-muted flex-shrink-0" />
              </button>

              {productMenuOpen && (
                <div className="absolute z-10 mt-1.5 w-full max-h-56 overflow-y-auto bg-dark-surface border border-dark-border-light rounded-xl shadow-xl p-1.5">
                  {productOptions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">Nenhum produto cadastrado.</p>
                  ) : (
                    productOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dark-hover cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={productIds.includes(opt.value)}
                          onChange={() => toggleProduct(opt.value)}
                          className="w-4 h-4 rounded accent-accent"
                        />
                        <span className="text-sm text-dark-text">{opt.label}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {productIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {productIds.map((id) => {
                  const opt = productOptions.find((o) => o.value === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 bg-dark-alt border border-dark-border rounded-full pl-2.5 pr-1.5 py-1 text-xs text-dark-text"
                    >
                      {opt?.label ?? id}
                      <button
                        type="button"
                        onClick={() => toggleProduct(id)}
                        className="w-4 h-4 rounded-full hover:bg-dark-hover flex items-center justify-center text-muted hover:text-danger transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <Input
            label="Vídeo do YouTube (opcional)"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          <div>
            <p className="text-sm font-medium text-dark-text mb-1.5">Imagem (opcional)</p>
            {imageUrl ? (
              <div className="space-y-2">
                <ImageFramingEditor
                  imageUrl={imageUrl}
                  posX={imagePosX}
                  posY={imagePosY}
                  scale={imageScale}
                  onChange={(next) => {
                    setImagePosX(next.posX);
                    setImagePosY(next.posY);
                    setImageScale(next.scale);
                  }}
                  aspect="4 / 3"
                />
                <button
                  type="button"
                  onClick={handleImageRemove}
                  disabled={imageUploading}
                  className="flex items-center gap-1.5 text-danger hover:text-danger/80 text-xs font-medium transition-colors"
                >
                  <Trash2 size={12} />
                  Remover imagem
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImageDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleImageFile(f);
                }}
                disabled={imageUploading}
                className={[
                  "w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors group",
                  imageDragging
                    ? "border-accent bg-accent/5"
                    : "border-dark-border hover:border-accent/50",
                ].join(" ")}
              >
                {imageUploading ? (
                  <Loader2 size={18} className="text-muted animate-spin" />
                ) : (
                  <>
                    <Upload size={18} className="text-muted group-hover:text-accent transition-colors" />
                    <span className="text-xs text-muted group-hover:text-accent transition-colors">
                      Arraste uma imagem ou clique para enviar (JPEG / PNG / WEBP, máx. 5 MB)
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
            />
          </div>

          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs font-medium text-dark-text mb-1.5">Ativo</p>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            <Input
              label="Ordem de exibição"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-32"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={requestClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              fullWidth
              isLoading={isPending}
              leftIcon={<Save size={14} />}
            >
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
