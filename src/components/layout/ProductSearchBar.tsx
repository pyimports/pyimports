"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2, PackageSearch } from "lucide-react";
import { routes } from "@/lib/routes";
import { formatCurrency } from "@/lib/formatters";
import { searchProductsAction, type ProductSearchResult } from "@/lib/actions/search";

export const ProductSearchBar = () => {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const ref       = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  // Fecha ao clicar fora, mesmo padrão do AnnouncementBell
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Busca com debounce de 300ms — não dispara uma requisição por tecla
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentRequest = ++requestId.current;

    const timer = setTimeout(async () => {
      const found = await searchProductsAction(term);
      if (requestId.current !== currentRequest) return; // resposta antiga, ignora
      setResults(found);
      setSearched(true);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Buscar produtos"
        className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-dark-surface border border-dark-border text-dark-text/70 hover:text-accent hover:border-accent/50 hover:shadow-[0_0_16px_rgba(59,130,246,0.25)] transition-all duration-200"
      >
        <Search size={20} />
      </button>

      {open && (
        <div className="fixed top-24 inset-x-4 mt-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:left-auto sm:mt-3 sm:w-96 z-50 animate-fade-in">
          <div className="relative rounded-2xl overflow-hidden bg-dark-surface border border-accent/25 shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_24px_64px_rgba(0,0,0,0.55)]">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-dark-border">
              <Search size={16} className="text-accent flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produtos..."
                className="flex-1 min-w-0 bg-transparent text-sm text-dark-text placeholder:text-muted focus:outline-none"
              />
              {loading && <Loader2 size={16} className="text-muted animate-spin flex-shrink-0" />}
              <button
                onClick={handleClose}
                aria-label="Fechar busca"
                className="text-muted hover:text-dark-text transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {searched && !loading && (
              <div className="max-h-96 overflow-y-auto divide-y divide-dark-border">
                {results.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <PackageSearch size={28} className="text-muted" />
                    <p className="text-sm text-muted">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  results.map((product) => {
                    const hasDiscount =
                      product.promotional_active &&
                      !!product.price_promotional &&
                      product.price_promotional > product.price_pix;

                    return (
                      <Link
                        key={product.id}
                        href={routes.produto(product.slug)}
                        onClick={handleClose}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-dark-alt/40 transition-colors"
                      >
                        <div className="relative w-12 h-12 rounded-lg bg-dark-alt overflow-hidden flex-shrink-0">
                          {product.image_url && (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-dark-text truncate">{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {hasDiscount && (
                              <span className="text-xs text-muted line-through">
                                {formatCurrency(product.price_promotional!)}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-accent">
                              {formatCurrency(product.price_pix)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
