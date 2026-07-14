import React from "react";
import { PackageOpen } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "accent" | "outline";
  };
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
  >
    <div className="mb-4 text-muted opacity-40">
      {icon || <PackageOpen size={56} strokeWidth={1} />}
    </div>
    <h3 className="text-base font-semibold text-dark-text mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
    )}
    {action && (
      <Button variant={action.variant || "outline"} onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);
