"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps) => {
  const trackSize = size === "sm" ? "w-8 h-4" : "w-11 h-6";
  const thumbSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const thumbTranslate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <label
      className={`inline-flex items-start gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={[
            "rounded-full transition-colors duration-200",
            trackSize,
            checked ? "bg-accent" : "bg-dark-hover",
          ].join(" ")}
        />
        <div
          className={[
            "absolute top-1 left-1 bg-white rounded-full shadow transition-transform duration-200",
            thumbSize,
            checked ? thumbTranslate : "translate-x-0",
          ].join(" ")}
        />
      </div>
      {(label || description) && (
        <div>
          {label && (
            <span className="block text-sm font-medium text-dark-text">{label}</span>
          )}
          {description && (
            <span className="block text-xs text-muted mt-0.5">{description}</span>
          )}
        </div>
      )}
    </label>
  );
};
