"use client";

import React, { useState } from "react";
import { Star, Search, Package, X, ImagePlus, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Input, Textarea } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { maskCpf } from "@/lib/utils";
import { formatDateShort } from "@/lib/formatters";
import { lookupReviewableOrders, submitCustomerReview, type ReviewableOrder } from "@/lib/actions/customer-reviews";

type Step = "cpf" | "orders" | "form" | "success";

const MAX_IMAGES = 4;

export function ReviewSubmitForm() {
  const [step, setStep] = useState<Step>("cpf");

  const [cpf, setCpf] = useState("");
  const [cpfLoading, setCpfLoading] = useState(false);
  const [cpfError, setCpfError] = useState("");

  const [orders, setOrders] = useState<ReviewableOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ReviewableOrder | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommends, setRecommends] = useState<boolean | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSearchOrders = async () => {
    setCpfError("");
    setCpfLoading(true);
    const result = await lookupReviewableOrders(cpf);
    setCpfLoading(false);

    if ("error" in result) {
      setCpfError(result.error);
      return;
    }
    setOrders(result.orders);
    setStep("orders");
  };

  const handleSelectOrder = (order: ReviewableOrder) => {
    setSelectedOrder(order);
    setStep("form");
  };

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...images, ...Array.from(files)].slice(0, MAX_IMAGES);
    setImages(next);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid =
    rating > 0 && recommends !== null && !!deliveryDate && description.trim().length >= 5;

  const handleSubmit = async () => {
    if (!selectedOrder || !isFormValid) return;
    setSubmitError("");
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

      const result = await submitCustomerReview({
        cpf,
        orderId: selectedOrder.order_id,
        rating,
        recommends: recommends as boolean,
        deliveryDate,
        description,
        images: imageUrls,
      });

      if ("error" in result) {
        setSubmitError(result.error);
        setSubmitting(false);
        return;
      }

      setStep("success");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível enviar sua avaliação.");
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="bg-dark-surface rounded-2xl border border-dark-border p-8 text-center">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} className="text-success" />
        </div>
        <h3 className="text-lg font-bold text-dark-text mb-2">Avaliação enviada!</h3>
        <p className="text-sm text-muted">
          Obrigado pelo seu feedback. Assim que aprovarmos, ela aparece aqui pra todo mundo ver.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-5">
      {step === "cpf" && (
        <>
          <div>
            <h3 className="text-base font-bold text-dark-text">Avaliar minha compra</h3>
            <p className="text-sm text-muted mt-1">
              Informe o CPF usado na compra pra localizarmos seus pedidos.
            </p>
          </div>
          <Input
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            error={cpfError}
          />
          <Button
            variant="accent"
            leftIcon={<Search size={16} />}
            isLoading={cpfLoading}
            disabled={cpf.length < 14}
            onClick={handleSearchOrders}
          >
            Buscar meus pedidos
          </Button>
        </>
      )}

      {step === "orders" && (
        <>
          <div>
            <h3 className="text-base font-bold text-dark-text">Qual pedido você quer avaliar?</h3>
            <p className="text-sm text-muted mt-1">Selecione o pedido correspondente.</p>
          </div>
          <div className="space-y-2">
            {orders.map((order) => (
              <button
                key={order.order_id}
                onClick={() => handleSelectOrder(order)}
                className="w-full text-left p-4 rounded-xl border border-dark-border hover:border-accent/50 hover:bg-accent/5 transition-all"
              >
                <p className="text-sm font-semibold text-dark-text">
                  Pedido #{order.order_number} — {formatDateShort(order.purchase_date)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {order.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "form" && selectedOrder && (
        <>
          <div>
            <h3 className="text-base font-bold text-dark-text">Sua avaliação</h3>
            <div className="flex items-start gap-2 text-xs text-muted mt-2 bg-dark-alt rounded-xl p-3">
              <Package size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Pedido #{selectedOrder.order_number} — comprado em{" "}
                {formatDateShort(selectedOrder.purchase_date)} —{" "}
                {selectedOrder.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}
              </span>
            </div>
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
                    size={28}
                    className={
                      n <= (hoverRating || rating) ? "fill-accent text-accent" : "text-dark-border"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text mb-1.5">
              Você recomenda a gente? <span className="text-danger">*</span>
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

          <Input
            label="Data de entrega"
            type="date"
            required
            value={deliveryDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />

          <Textarea
            label="Conte como foi sua experiência"
            required
            counter
            maxLength={1500}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que você achou do produto, da entrega, do atendimento..."
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

          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <Button
            variant="accent"
            fullWidth
            isLoading={submitting}
            disabled={!isFormValid}
            onClick={handleSubmit}
          >
            Enviar avaliação
          </Button>
        </>
      )}
    </div>
  );
}
