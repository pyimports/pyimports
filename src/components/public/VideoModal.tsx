"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface VideoModalProps {
  videoUrl: string;
  onClose: () => void;
}

export const VideoModal = ({ videoUrl, onClose }: VideoModalProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Fechar vídeo"
        >
          <X size={18} className="text-white" />
        </button>
        <iframe
          src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vídeo do depoimento"
        />
      </div>
    </div>
  );
};
