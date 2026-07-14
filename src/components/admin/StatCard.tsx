import React from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  accent?: boolean;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  accent = false,
}: StatCardProps) => {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={[
        "relative p-5 rounded-2xl border transition-all duration-150",
        accent
          ? "bg-accent/5 border-accent/20 hover:border-accent/40"
          : "bg-dark-surface border-dark-border hover:border-dark-border-light",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider truncate">
            {title}
          </p>
          <p
            className={[
              "text-2xl font-bold mt-1 truncate",
              accent ? "text-accent" : "text-dark-text",
            ].join(" ")}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className={[
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              accent ? "bg-accent/10" : "bg-dark-alt",
            ].join(" ")}
          >
            <Icon size={20} className={accent ? "text-accent" : "text-muted"} />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {isPositive ? (
            <TrendingUp size={13} className="text-success" />
          ) : isNegative ? (
            <TrendingDown size={13} className="text-danger" />
          ) : (
            <Minus size={13} className="text-muted" />
          )}
          <span
            className={[
              "text-xs font-medium",
              isPositive ? "text-success" : isNegative ? "text-danger" : "text-muted",
            ].join(" ")}
          >
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
          {trendLabel && (
            <span className="text-xs text-muted">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
