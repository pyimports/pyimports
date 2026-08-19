"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useCartStore } from "@/store/cart-store";

export const InsuranceOption = () => {
  const { insurance_enabled, insurance_percentage, setInsurance, getItemCount, getSubtotal } = useCartStore();
  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const insuranceTotal = subtotal * insurance_percentage;

  return (
    <label className="flex items-start gap-3 p-4 rounded-2xl border border-dark-border bg-dark-surface cursor-pointer">
      <input
        type="checkbox"
        checked={insurance_enabled}
        onChange={(e) => setInsurance(e.target.checked)}
        className="sr-only"
      />
      <div
        className={[
          "w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          insurance_enabled ? "bg-accent border-accent" : "border-dark-border-light",
        ].join(" ")}
      >
        {insurance_enabled && (
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-dark-bg stroke-[3]">
            <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
          <ShieldCheck size={16} className="text-accent flex-shrink-0" />
          Seguro da mercadoria
        </div>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Se o pacote tiver algum problema ou extravio, reenviamos a mercadoria.{" "}
          {insurance_percentage > 0
            ? `${Math.round(insurance_percentage * 100)}% do valor da compra.`
            : "Sem custo, incluso pra todos os clientes."}
        </p>
        {itemCount > 0 && insurance_percentage > 0 && (
          <p className="text-xs mt-1.5">
            <span className="text-muted">
              {Math.round(insurance_percentage * 100)}% de {formatCurrency(subtotal)} —{" "}
            </span>
            <span className={insurance_enabled ? "text-accent font-semibold" : "text-muted"}>
              {formatCurrency(insuranceTotal)}
            </span>
          </p>
        )}
        {itemCount > 0 && insurance_percentage === 0 && (
          <p className="text-xs mt-1.5 text-accent font-semibold">Grátis</p>
        )}
      </div>
    </label>
  );
};
