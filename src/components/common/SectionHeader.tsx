import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}

export const SectionHeader = ({
  title,
  subtitle,
  eyebrow,
  action,
  className = "",
  align = "left",
}: SectionHeaderProps) => (
  <div
    className={[
      "flex gap-4",
      align === "center" ? "flex-col items-center text-center" : "items-start justify-between",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <div className={align === "center" ? "flex flex-col items-center" : ""}>
      {eyebrow && (
        <span className="eyebrow-label mb-3">{eyebrow}</span>
      )}
      <h2 className="text-2xl md:text-3xl font-bold text-dark-text tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm text-muted mt-2 leading-relaxed">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0 mt-1">{action}</div>}
  </div>
);

// Container de largura máxima
export const Container = ({
  children,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg" | "full";
}) => {
  const maxW = {
    sm: "max-w-3xl",
    default: "max-w-6xl",
    lg: "max-w-7xl",
    full: "max-w-full",
  };
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 ${maxW[size]} ${className}`}>
      {children}
    </div>
  );
};
