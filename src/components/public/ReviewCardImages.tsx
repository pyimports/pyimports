"use client";

import React, { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
}

export function ReviewCardImages({ images }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {images.map((url) => (
          <button
            key={url}
            onClick={() => setLightbox(url)}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-dark-border flex-shrink-0 hover:border-accent/50 transition-colors"
          >
            <Image src={url} alt="Foto da avaliação" fill className="object-cover" unoptimized />
          </button>
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
    </>
  );
}
