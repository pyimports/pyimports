"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const Select = ({
  label,
  error,
  helper,
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  className = "",
  required = false,
}: SelectProps) => {
  const id = `select-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-dark-text mb-1.5">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          className={[
            "w-full bg-dark-surface border rounded-xl px-4 py-2.5 text-sm text-dark-text",
            "appearance-none outline-none transition-all duration-150",
            "focus:border-accent focus:ring-2 focus:ring-accent/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-danger"
              : "border-dark-border-light",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {placeholder && (
            <option value="" disabled className="bg-dark-surface text-muted">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-dark-surface text-dark-text"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <ChevronDown size={16} />
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {helper && !error && <p className="mt-1 text-xs text-muted">{helper}</p>}
    </div>
  );
};
