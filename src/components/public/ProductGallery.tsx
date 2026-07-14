"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Play, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductMedia } from "@/types";

interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
}

const SWIPE_THRESHOLD = 50;

export const ProductGallery = ({ media, productName }: ProductGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const selected = media[selectedIndex];

  const goPrev = () => setSelectedIndex((i) => (i - 1 + media.length) % media.length);
  const goNext = () => setSelectedIndex((i) => (i + 1) % media.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  if (!media.length) {
    return (
      <div className="aspect-square bg-dark-alt rounded-2xl flex items-center justify-center text-muted">
        <span className="text-sm">Sem imagem disponível</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main display */}
      <div
        className="relative aspect-square bg-dark-alt rounded-2xl overflow-hidden group"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {selected?.type === "video" ? (
          <iframe
            src={selected.url}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`Vídeo: ${productName}`}
          />
        ) : selected ? (
          <>
            <Image
              src={selected.url}
              alt={selected.alt_text || productName}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <ZoomIn size={20} className="text-white" />
              </div>
            </button>
          </>
        ) : null}

        {media.length > 1 && (
          <>
            {/* Setas — desktop e mobile */}
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
              aria-label="Próxima imagem"
            >
              <ChevronRight size={18} className="text-white" />
            </button>

            {/* Contador */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full z-10">
              {selected?.type === "video" ? "Vídeo" : "Imagem"} {selectedIndex + 1} de {media.length}
            </div>

            {/* Indicadores */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === selectedIndex ? "w-6 bg-accent" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`Ir para mídia ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(i)}
              className={[
                "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-150 relative",
                i === selectedIndex
                  ? "border-accent shadow-lg shadow-accent/20"
                  : "border-dark-border hover:border-accent/40",
              ].join(" ")}
            >
              {item.type === "video" ? (
                <>
                  <Image
                    src={item.thumbnail_url || "https://placehold.co/64x64/1e2535/c9a84c?text=▶"}
                    alt="Vídeo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play size={16} className="text-white" />
                  </div>
                </>
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt_text || `Foto ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
