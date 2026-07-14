"use client";

import Link from "next/link";
import { buildQuantityPriceOptions } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import type { PriceTier } from "@/types";

export interface BannerSlideProps {
  imageUrl: string;
  mobileImageUrl?: string | null;
  desktopPosX?: number;
  desktopPosY?: number;
  desktopScale?: number;
  mobilePosX?: number;
  mobilePosY?: number;
  mobileScale?: number;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
  /**
   * Produto vinculado ao banner com promoção por quantidade — quando presente,
   * exibe a faixa "1 Caixa / 2 Caixas / ..." calculada automaticamente a
   * partir da tabela de preços do próprio produto (o admin não digita nada).
   */
  quantityPricing?: {
    price_pix: number;
    quantity_pricing_enabled: boolean;
    price_tiers?: PriceTier[];
  };
  /**
   * undefined → responsivo via CSS breakpoints (usado na Home real)
   * "desktop" → força imagem desktop, sem media query (usado no preview do admin)
   * "mobile"  → força imagem mobile, sem media query (usado no preview do admin)
   */
  mode?: "desktop" | "mobile";
}

export const BannerSlide = ({
  imageUrl,
  mobileImageUrl,
  desktopPosX = 50,
  desktopPosY = 50,
  desktopScale = 1,
  mobilePosX,
  mobilePosY,
  mobileScale,
  title,
  subtitle,
  linkUrl,
  quantityPricing,
  mode,
}: BannerSlideProps) => {
  const tierOptions =
    quantityPricing?.quantity_pricing_enabled
      ? buildQuantityPriceOptions(quantityPricing.price_pix, quantityPricing.price_tiers)
      : [];
  const effMobilePosX  = mobilePosX  ?? desktopPosX;
  const effMobilePosY  = mobilePosY  ?? desktopPosY;
  const effMobileScale = mobileScale ?? desktopScale;
  const effMobileImage = mobileImageUrl || imageUrl;
  const responsive     = !mode;

  const desktopWrapClass = responsive
    ? "absolute inset-0 hidden sm:block overflow-hidden group-hover:scale-[1.02] transition-transform duration-700"
    : mode === "desktop"
    ? "absolute inset-0 overflow-hidden"
    : "hidden";

  const mobileWrapClass = responsive
    ? "absolute inset-0 block sm:hidden overflow-hidden group-hover:scale-[1.02] transition-transform duration-700"
    : mode === "mobile"
    ? "absolute inset-0 overflow-hidden"
    : "hidden";

  // transformOrigin usa o mesmo ponto focal da posição, fazendo o zoom
  // sempre ancorar no ponto configurado pelo usuário.
  const desktopImgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${desktopPosX}% ${desktopPosY}%`,
    transform: `scale(${desktopScale})`,
    transformOrigin: `${desktopPosX}% ${desktopPosY}%`,
  };

  const mobileImgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${effMobilePosX}% ${effMobilePosY}%`,
    transform: `scale(${effMobileScale})`,
    transformOrigin: `${effMobilePosX}% ${effMobilePosY}%`,
  };

  const inner = (
    <>
      {/* Imagem desktop */}
      <div className={desktopWrapClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title ?? "Banner"} style={desktopImgStyle} />
      </div>

      {/* Imagem mobile */}
      <div className={mobileWrapClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={effMobileImage} alt={title ?? "Banner"} style={mobileImgStyle} />
      </div>

      {/* Overlay de legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/65" />

      {/* Texto — renderizado apenas se existir */}
      {(title || subtitle) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-20 sm:py-24">
          {title && (
            <h2 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-3 sm:mb-4 tracking-tight drop-shadow-lg">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-base sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Faixa de promoção por quantidade — calculada do produto vinculado */}
      {tierOptions.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 flex-wrap justify-center px-4">
          {tierOptions.map((opt) => (
            <div
              key={opt.quantity}
              className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center shadow-lg"
            >
              <p className="text-[10px] font-semibold text-dark-bg/70 leading-none">
                {opt.quantity} {opt.quantity === 1 ? "Caixa" : "Caixas"}
              </p>
              <p className="text-sm font-bold text-danger leading-tight">
                {formatCurrency(opt.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Se houver link, o banner inteiro é clicável — nenhum botão separado.
  // Os dots/setas do carrossel ficam em z-20 por cima do link.
  if (linkUrl) {
    return (
      <Link
        href={linkUrl}
        className="absolute inset-0 block cursor-pointer group"
        aria-label={title ?? "Acessar promoção"}
      >
        {inner}
      </Link>
    );
  }

  return <>{inner}</>;
};
