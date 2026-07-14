"use client";

import React, { useRef, useState } from "react";
import { RefreshCw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { ReviewImage } from "@/components/shared/ReviewImage";

interface ImageFramingEditorProps {
  imageUrl: string;
  posX: number;
  posY: number;
  scale: number;
  onChange: (next: { posX: number; posY: number; scale: number }) => void;
  aspect?: string; // ex: "1 / 1" — deve ser o MESMO valor usado na exibição pública
  /** "circle" renderiza a caixa de edição com máscara redonda (1:1), igual ao
   * avatar circular da Home — ignora `aspect` quando ativo. */
  shape?: "rectangle" | "circle";
  /** Largura máxima da caixa quando shape="circle". Ex: "140px". */
  size?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SCALE_STEP = 0.1;

// Editor de enquadramento de imagem — usa o mesmo <ReviewImage> que renderiza
// o card público, então o que se vê aqui é pixel-a-pixel (proporcionalmente)
// igual ao que aparece na Home. Arraste direto do mouse/touch sobre a própria
// imagem para reposicionar, além de zoom e botão de centralizar.
export function ImageFramingEditor({
  imageUrl,
  posX,
  posY,
  scale,
  onChange,
  aspect = "4 / 3",
  shape = "rectangle",
  size,
}: ImageFramingEditorProps) {
  const isCircle = shape === "circle";
  const effectiveAspect = isCircle ? "1 / 1" : aspect;
  const boxRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, posX, posY };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    // Arrastar a imagem para a direita revela a borda esquerda dela —
    // ou seja, o ponto focal (object-position) diminui. Por isso o sinal
    // é invertido em relação ao movimento do mouse.
    const nextX = clamp(dragState.current.posX - (dx / rect.width) * 100);
    const nextY = clamp(dragState.current.posY - (dy / rect.height) * 100);
    onChange({ posX: nextX, posY: nextY, scale });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    setDragging(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const setScale = (next: number) => {
    onChange({ posX, posY, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(next.toFixed(2)))) });
  };

  const reset = () => onChange({ posX: 50, posY: 50, scale: 1 });

  return (
    <div className="space-y-2">
      <ReviewImage
        ref={boxRef}
        src={imageUrl}
        alt="Pré-visualização"
        posX={posX}
        posY={posY}
        scale={scale}
        aspect={effectiveAspect}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={[
          "border border-dark-border select-none touch-none",
          isCircle ? "rounded-full" : "rounded-xl",
          dragging ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
        style={isCircle ? { maxWidth: size ?? "140px", marginLeft: "auto", marginRight: "auto" } : undefined}
      >
        {!isCircle && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
            <Move size={11} />
            Arraste para posicionar
          </div>
        )}
      </ReviewImage>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setScale(scale - SCALE_STEP)}
          className="w-7 h-7 rounded-lg border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center transition-all"
          aria-label="Diminuir zoom"
        >
          <ZoomOut size={13} />
        </button>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={SCALE_STEP}
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-yellow-400 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setScale(scale + SCALE_STEP)}
          className="w-7 h-7 rounded-lg border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center transition-all"
          aria-label="Aumentar zoom"
        >
          <ZoomIn size={13} />
        </button>
        <span className="text-xs font-mono text-accent w-10 text-right">{scale.toFixed(1)}×</span>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors flex-shrink-0"
          title="Centralizar e resetar zoom"
        >
          <RefreshCw size={12} />
          Centralizar
        </button>
      </div>
    </div>
  );
}
