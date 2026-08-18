"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
}

export function ReviewCardImages({ images }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightbox]);

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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
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
