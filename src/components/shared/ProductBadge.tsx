import React from "react";

// Selo/badge customizado sobre o card do produto. Componente único usado
// tanto no card público (ProductCard) quanto no editor do Admin
// (ProductBadgeEditor) — garante que a posição/tamanho configurados sejam
// SEMPRE idênticos nos dois lugares, sem duplicar a fórmula de CSS.

export interface ProductBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  url: string;
  posX: number; // 0-100, centro do selo, % da largura do card
  posY: number; // 0-100, centro do selo, % da altura do card
  widthPct: number; // % da largura do card — altura é proporcional (natural)
}

export const ProductBadge = React.forwardRef<HTMLDivElement, ProductBadgeProps>(
  function ProductBadge({ url, posX, posY, widthPct, className, style, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={["absolute", className].filter(Boolean).join(" ")}
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
          width: `${widthPct}%`,
          transform: "translate(-50%, -50%)",
          ...style,
        }}
        {...rest}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          className="w-full h-auto select-none pointer-events-none"
        />
      </div>
    );
  }
);
