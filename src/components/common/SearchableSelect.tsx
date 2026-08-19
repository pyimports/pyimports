"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

// Select com campo de busca embutido — o <select> nativo não filtra por
// texto, o que atrapalha em listas longas (ex.: catálogo de produtos).
export const SearchableSelect = ({ options, value, onChange, placeholder = "Selecione...", label }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-dark-text mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-dark-surface border border-dark-border-light rounded-xl px-4 py-2.5 text-sm text-left outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        <span className={selectedLabel ? "text-dark-text truncate" : "text-muted truncate"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} className="text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-dark-surface border border-dark-border-light rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-dark-border flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-dark-alt border border-dark-border rounded-lg pl-8 pr-2 py-1.5 text-sm text-dark-text outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted">Nenhum produto encontrado.</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  opt.value === value ? "bg-accent/10 text-accent" : "text-dark-text hover:bg-dark-alt",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
