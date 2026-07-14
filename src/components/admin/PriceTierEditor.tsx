"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/common/Input";
import { Toggle } from "@/components/common/Toggle";
import type { PriceTier } from "@/types";

interface Props {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tiers: PriceTier[];
  onTiersChange: (tiers: PriceTier[]) => void;
  basePrice: number;
}

export function PriceTierEditor({
  enabled,
  onEnabledChange,
  tiers,
  onTiersChange,
  basePrice,
}: Props) {
  const addTier = () => {
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].quantity : 1;
    onTiersChange([...tiers, { quantity: lastQty + 1, unit_price: basePrice }]);
  };

  const removeTier = (index: number) => {
    onTiersChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof PriceTier, value: number) => {
    onTiersChange(tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-dark-text mb-1.5">Promoção por quantidade</p>
        <Toggle checked={enabled} onChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted px-1">
            <span>Quantidade</span>
            <span>Preço unitário (R$)</span>
            <span />
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <Input value="1" disabled />
            <Input value={basePrice.toFixed(2)} disabled />
            <span />
          </div>

          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input
                type="number"
                min={2}
                value={tier.quantity}
                onChange={(e) => updateTier(i, "quantity", parseInt(e.target.value) || 2)}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={tier.unit_price}
                onChange={(e) => updateTier(i, "unit_price", parseFloat(e.target.value) || 0)}
              />
              <button
                type="button"
                onClick={() => removeTier(i)}
                className="w-8 h-8 rounded-lg border border-dark-border flex items-center justify-center hover:border-danger/40 hover:text-danger transition-all"
                aria-label="Remover linha"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addTier}
            className="flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus size={13} /> Adicionar quantidade
          </button>

          <p className="text-xs text-muted">
            A quantidade 1 sempre usa o Preço Pix normal. Cadastre aqui o preço unitário para
            quantidades maiores (ex: 2, 3, 4 caixas).
          </p>
        </div>
      )}
    </div>
  );
}
