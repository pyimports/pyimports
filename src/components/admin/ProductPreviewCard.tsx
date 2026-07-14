"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export interface PreviewMedia {
  url: string;
  type: "image" | "video";
}

interface ProductPreviewCardProps {
  name?: string;
  short_description?: string;
  price_pix?: number;
  price_card?: number;
  price_promotional?: number | null;
  promotional_active?: boolean;
  is_featured?: boolean;
  category_name?: string;
  media?: PreviewMedia[];
}

export const ProductPreviewCard = ({
  name = "Nome do produto",
  short_description,
  price_pix = 0,
  price_card = 0,
  price_promotional,
  promotional_active = false,
  is_featured = false,
  category_name = "Categoria",
  media = [],
}: ProductPreviewCardProps) => {
  const [index, setIndex] = useState(0);
  const safeIndex = media.length > 0 ? Math.min(index, media.length - 1) : 0;
  const current = media[safeIndex];

  const goPrev = () => setIndex((i) => (i - 1 + media.length) % media.length);
  const goNext = () => setIndex((i) => (i + 1) % media.length);

  const hasDiscount = promotional_active && !!price_promotional && price_promotional > price_pix;
  const discountPercent = hasDiscount
    ? Math.round(((price_promotional! - price_pix) / price_promotional!) * 100)
    : 0;

  return (
    <div className="bg-dark-alt rounded-2xl border border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-danger" />
        <span className="w-2 h-2 rounded-full bg-warning" />
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-muted ml-2">Pré-visualização do produto</span>
      </div>

      {/* Gallery */}
      <div className="relative aspect-square bg-dark-bg group">
        {current ? (
          current.type === "video" ? (
            <iframe
              src={current.url}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Pré-visualização do vídeo"
            />
          ) : (
            <Image src={current.url} alt={name} fill className="object-cover" unoptimized />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted text-sm">Sem imagem</span>
          </div>
        )}

        {is_featured && (
          <span className="absolute top-2 left-2 bg-accent text-dark-bg text-xs font-bold px-2 py-0.5 rounded-full">
            Destaque
          </span>
        )}

        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-white text-danger text-xs font-extrabold px-2 py-0.5 rounded-full shadow-lg">
            -{discountPercent}%
          </span>
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Mídia anterior"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Próxima mídia"
            >
              <ChevronRight size={14} className="text-white" />
            </button>

            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
              {current?.type === "video" ? "Vídeo" : "Imagem"} {safeIndex + 1} de {media.length}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {media.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === safeIndex ? "bg-accent" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="text-xs font-medium text-muted uppercase tracking-wider">
          {category_name}
        </div>
        <div className="text-sm font-semibold text-dark-text leading-snug line-clamp-2">
          {name}
        </div>
        {short_description && (
          <p className="text-xs text-muted line-clamp-2">{short_description}</p>
        )}
        <div className="flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-xs text-muted line-through">
              {formatCurrency(price_promotional!)}
            </span>
          )}
          <span className="text-lg font-bold text-accent">{formatCurrency(price_pix)}</span>
          <span className="text-xs text-muted">no Pix</span>
        </div>
        {price_card > 0 && (
          <div className="text-xs text-muted">{formatCurrency(price_card)} no cartão</div>
        )}
      </div>
    </div>
  );
};
