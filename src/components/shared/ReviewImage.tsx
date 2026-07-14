import React, { forwardRef } from "react";

export interface ReviewImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  posX: number;
  posY: number;
  scale: number;
  aspect?: string;
}

// Componente único para renderizar a imagem de um feedback com enquadramento
// (posição + zoom). Usado tanto no editor do Admin quanto no card público da
// Home — garante que aspect-ratio, object-fit, object-position, transform e
// transform-origin sejam SEMPRE idênticos nos dois lugares, sem duplicar CSS.
export const ReviewImage = forwardRef<HTMLDivElement, ReviewImageProps>(function ReviewImage(
  { src, alt, posX, posY, scale, aspect = "4 / 3", className, children, style, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={["relative w-full overflow-hidden", className].filter(Boolean).join(" ")}
      style={{ aspectRatio: aspect, ...style }}
      {...rest}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${posX}% ${posY}%`,
          transform: `scale(${scale})`,
          transformOrigin: `${posX}% ${posY}%`,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
});
