import type { CSSProperties } from "react";

// Componente único para renderizar a imagem de uma categoria, com
// enquadramento (posição + zoom) independente para desktop e mobile — mesmo
// conceito do BannerSlide. Usado tanto no card público (Home/Catálogo) quanto
// no preview do Admin, para garantir que nunca divirjam.

export interface CategoryImageProps {
  desktopUrl: string;
  mobileUrl?: string | null;
  desktopPosX?: number;
  desktopPosY?: number;
  desktopScale?: number;
  mobilePosX?: number;
  mobilePosY?: number;
  mobileScale?: number;
  alt: string;
  /**
   * undefined → responsivo via CSS breakpoints (usado no site real)
   * "desktop" → força imagem/enquadramento desktop (usado no preview do admin)
   * "mobile"  → força imagem/enquadramento mobile (usado no preview do admin)
   */
  mode?: "desktop" | "mobile";
  className?: string;
}

export function CategoryImage({
  desktopUrl,
  mobileUrl,
  desktopPosX = 50,
  desktopPosY = 50,
  desktopScale = 1,
  mobilePosX,
  mobilePosY,
  mobileScale,
  alt,
  mode,
  className,
}: CategoryImageProps) {
  const effMobileUrl = mobileUrl || desktopUrl;
  const effMobilePosX = mobilePosX ?? desktopPosX;
  const effMobilePosY = mobilePosY ?? desktopPosY;
  const effMobileScale = mobileScale ?? desktopScale;
  const responsive = !mode;

  const desktopWrapClass = responsive
    ? "absolute inset-0 hidden sm:block"
    : mode === "desktop"
    ? "absolute inset-0"
    : "hidden";

  const mobileWrapClass = responsive
    ? "absolute inset-0 block sm:hidden"
    : mode === "mobile"
    ? "absolute inset-0"
    : "hidden";

  const desktopImgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${desktopPosX}% ${desktopPosY}%`,
    transform: `scale(${desktopScale})`,
    transformOrigin: `${desktopPosX}% ${desktopPosY}%`,
  };

  const mobileImgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${effMobilePosX}% ${effMobilePosY}%`,
    transform: `scale(${effMobileScale})`,
    transformOrigin: `${effMobilePosX}% ${effMobilePosY}%`,
  };

  return (
    <div className={["absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")}>
      <div className={desktopWrapClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={desktopUrl} alt={alt} style={desktopImgStyle} />
      </div>
      <div className={mobileWrapClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={effMobileUrl} alt={alt} style={mobileImgStyle} />
      </div>
    </div>
  );
}
