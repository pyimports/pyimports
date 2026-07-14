"use client";

import React, { useRef, useState } from "react";
import { Upload, X, Move, Loader2, RefreshCw, Minus, Plus } from "lucide-react";
import { ProductCard } from "@/components/public/ProductCard";
import { ProductBadge } from "@/components/shared/ProductBadge";
import type { Product } from "@/types";

export interface ProductBadgeValue {
  url: string;
  storagePath: string;
  posX: number;
  posY: number;
  widthPct: number;
}

interface Props {
  productId: string;
  value: ProductBadgeValue | null;
  onChange: (next: ProductBadgeValue | null) => void;
  /** Produto montado a partir do estado atual do formulário, SEM os campos
   * de badge — o selo é desenhado por cima separadamente, evitando
   * renderizar a imagem duas vezes (uma "de verdade" e uma arrastável). */
  previewProduct: Product;
}

const MIN_WIDTH = 8;
const MAX_WIDTH = 60;
const WIDTH_STEP = 1;

export function ProductBadgeEditor({ productId, value, onChange, previewProduct }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const previousPath = value?.storagePath;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", productId);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json() as { url?: string; storagePath?: string; error?: string };
      if (json.error || !json.url) {
        setError(json.error ?? "Erro ao fazer upload.");
        return;
      }
      // Mantém posição/tamanho ao trocar um selo já posicionado; só usa o
      // padrão centralizado quando é o primeiro envio.
      onChange({
        url: json.url,
        storagePath: json.storagePath!,
        posX: value?.posX ?? 50,
        posY: value?.posY ?? 50,
        widthPct: value?.widthPct ?? 25,
      });
      if (previousPath && previousPath !== json.storagePath) {
        fetch(`/api/admin/upload?path=${encodeURIComponent(previousPath)}`, { method: "DELETE" }).catch(() => {});
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value?.storagePath) {
      await fetch(`/api/admin/upload?path=${encodeURIComponent(value.storagePath)}`, { method: "DELETE" });
    }
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!value) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, posX: value.posX, posY: value.posY };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !containerRef.current || !value) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const nextX = clamp(dragState.current.posX + (dx / rect.width) * 100, 0, 100);
    const nextY = clamp(dragState.current.posY + (dy / rect.height) * 100, 0, 100);
    onChange({ ...value, posX: nextX, posY: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    setDragging(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const setWidthPct = (next: number) => {
    if (!value) return;
    onChange({ ...value, widthPct: clamp(Number(next.toFixed(0)), MIN_WIDTH, MAX_WIDTH) });
  };

  const reset = () => {
    if (!value) return;
    onChange({ ...value, posX: 50, posY: 50, widthPct: 25 });
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-danger">{error}</p>}

      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full max-w-[280px] border-2 border-dashed border-dark-border hover:border-accent/50 rounded-xl flex flex-col items-center justify-center gap-2 py-8 transition-colors group"
        >
          {uploading ? (
            <Loader2 size={22} className="text-muted animate-spin" />
          ) : (
            <>
              <Upload size={22} className="text-muted group-hover:text-accent transition-colors" />
              <span className="text-sm text-muted group-hover:text-accent transition-colors">
                Enviar imagem do selo
              </span>
              <span className="text-xs text-muted/70 text-center px-4">
                PNG com fundo transparente funciona melhor
              </span>
              <span className="text-xs text-muted/60 text-center px-4">
                Recomendado: mínimo 500×500px — qualquer proporção (a imagem
                não é cortada, só redimensionada mantendo sua forma original)
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Move size={11} />
            Arraste o selo sobre a foto para posicionar — ele não sai da área da imagem
          </p>

          {/* Preview real — mesmo ProductCard do site, com o selo arrastável por cima.
              A área de arrasto cobre EXATAMENTE a mesma região da foto (aspect-[4/5],
              topo do card) e tem overflow-hidden — o selo nunca escapa para a área de
              texto abaixo, no editor ou no site, porque os dois usam a mesma fórmula. */}
          <div className="relative max-w-[320px]">
            <div className="pointer-events-none">
              <ProductCard product={previewProduct} />
            </div>
            <div
              ref={containerRef}
              className="absolute top-0 left-0 right-0 aspect-[4/5] overflow-hidden"
            >
              <ProductBadge
                url={value.url}
                posX={value.posX}
                posY={value.posY}
                widthPct={value.widthPct}
                className={[
                  "z-30 border-2 border-dashed rounded transition-colors",
                  dragging ? "border-accent cursor-grabbing" : "border-accent/50 hover:border-accent cursor-grab",
                ].join(" ")}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>
          </div>

          {/* Tamanho */}
          <div className="flex items-center gap-3 max-w-[320px]">
            <button
              type="button"
              onClick={() => setWidthPct(value.widthPct - WIDTH_STEP)}
              className="w-7 h-7 rounded-lg border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center transition-all"
              aria-label="Diminuir tamanho"
            >
              <Minus size={13} />
            </button>
            <input
              type="range"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              step={WIDTH_STEP}
              value={value.widthPct}
              onChange={(e) => setWidthPct(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-yellow-400 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setWidthPct(value.widthPct + WIDTH_STEP)}
              className="w-7 h-7 rounded-lg border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center transition-all"
              aria-label="Aumentar tamanho"
            >
              <Plus size={13} />
            </button>
            <span className="text-xs font-mono text-accent w-10 text-right">{value.widthPct}%</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
            >
              <RefreshCw size={12} />
              Centralizar
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Trocar selo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 transition-colors"
            >
              <X size={12} />
              Remover selo
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
