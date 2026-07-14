import React from "react";
import type { LucideIcon } from "lucide-react";

interface ReportCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export const ReportCard = ({
  title,
  value,
  description,
  icon: Icon,
  children,
  className = "",
}: ReportCardProps) => {
  return (
    <div
      className={[
        "bg-dark-surface border border-dark-border rounded-2xl p-5 space-y-4",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-dark-text mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 bg-dark-alt rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-accent" />
          </div>
        )}
      </div>

      {children && <div>{children}</div>}
    </div>
  );
};
