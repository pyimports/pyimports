"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useCartStore } from "@/store/cart-store";

export const InsuranceOption = () => {
  const { insurance_percentage, getItemCount, getSubtotal } = useCartStore();
  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const insuranceTotal = subtotal * insurance_percentage;

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-accent/50 bg-gradient-to-br from-accent-dim to-dark-surface animate-pulse-blue">
      <ShieldCheck size={18} className="text-accent-light flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-dark-text">Seguro da mercadoria</span>
          {insurance_percentage === 0 && (
            <span className="text-[11px] font-bold text-dark-bg bg-accent-light px-2 py-0.5 rounded-full">
              GRÁTIS
            </span>
          )}
        </div>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Se o pacote tiver algum problema ou extravio, reenviamos a mercadoria.{" "}
          {insurance_percentage > 0
            ? `${Math.round(insurance_percentage * 100)}% do valor da compra.`
            : "Sem custo, incluso automaticamente pra todos os clientes."}
        </p>
        {itemCount > 0 && insurance_percentage > 0 && (
          <p className="text-xs mt-1.5">
            <span className="text-muted">
              {Math.round(insurance_percentage * 100)}% de {formatCurrency(subtotal)} —{" "}
            </span>
            <span className="text-accent-light font-semibold">{formatCurrency(insuranceTotal)}</span>
          </p>
        )}
      </div>
    </div>
  );
};
