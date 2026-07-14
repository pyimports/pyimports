"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { INSURANCE_PERCENTAGE } from "@/lib/pricing";
import { useCartStore } from "@/store/cart-store";

export const InsuranceOption = () => {
  const { insurance_enabled, setInsurance, getItemCount, getSubtotal } = useCartStore();
  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const insuranceTotal = subtotal * INSURANCE_PERCENTAGE;

  return (
    <label
      className={[
        "flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-150",
        insurance_enabled
          ? "border-accent bg-accent-dim"
          : "border-dark-border-light hover:border-accent/40 bg-dark-surface",
      ].join(" ")}
    >
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
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Se o pacote tiver algum problema ou extravio, reenviamos a mercadoria.{" "}
          {Math.round(INSURANCE_PERCENTAGE * 100)}% do valor da compra.
        </p>
        {itemCount > 0 && (
          <p className="text-xs mt-1.5">
            <span className="text-muted">
              {Math.round(INSURANCE_PERCENTAGE * 100)}% de {formatCurrency(subtotal)} —{" "}
            </span>
            <span className={insurance_enabled ? "text-accent font-semibold" : "text-muted"}>
              {formatCurrency(insuranceTotal)}
            </span>
          </p>
        )}
      </div>
    </label>
  );
};
