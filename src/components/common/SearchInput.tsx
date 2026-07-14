"use client";

import React, { useState, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
}

export const SearchInput = ({
  placeholder = "Buscar...",
  value: externalValue,
  onChange,
  onSearch,
  className = "",
}: SearchInputProps) => {
  const [internal, setInternal] = useState("");
  const value = externalValue !== undefined ? externalValue : internal;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (externalValue === undefined) setInternal(v);
      onChange?.(v);
    },
    [externalValue, onChange]
  );

  const handleClear = useCallback(() => {
    if (externalValue === undefined) setInternal("");
    onChange?.("");
    onSearch?.("");
  }, [externalValue, onChange, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") onSearch?.(value);
    },
    [value, onSearch]
  );

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
        <Search size={16} />
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-dark-surface border border-dark-border-light rounded-xl pl-10 pr-10 py-2.5 text-sm text-dark-text placeholder-muted
          outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-150"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark-text transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
