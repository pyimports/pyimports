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
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-dark-border bg-dark-surface">
      <ShieldCheck size={18} className="text-accent flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-dark-text">Seguro da mercadoria</div>
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
            <span className="text-accent font-semibold">{formatCurrency(insuranceTotal)}</span>
          </p>
        )}
        {itemCount > 0 && insurance_percentage === 0 && (
          <p className="text-xs mt-1.5 text-accent font-semibold">Grátis</p>
        )}
      </div>
    </div>
  );
};
