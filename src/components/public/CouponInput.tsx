"use client";

import React, { useState } from "react";
import { Tag, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { formatCurrency } from "@/lib/formatters";
import { validateCouponPublic } from "@/lib/actions/coupons";
import { useCartStore } from "@/store/cart-store";

export const CouponInput = () => {
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const {
    coupon_code, coupon_discount, coupon_type,
    setCoupon, clearCoupon, getSubtotal, getShippingValue,
  } = useCartStore();

  const handleApply = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) { setError("Digite um código de cupom."); return; }
    setError("");
    setLoading(true);

    const subtotal  = getSubtotal();
    const shipping  = getShippingValue();
    const result    = await validateCouponPublic(clean, subtotal, shipping);

    setLoading(false);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    setCoupon(clean, result.discount, result.type);
    setCode("");
  };

  if (coupon_code) {
    return (
      <div className="flex items-center justify-between p-3 bg-success-bg border border-success/20 rounded-xl animate-fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-success" />
          <div>
            <span className="text-sm font-mono font-bold text-success">{coupon_code}</span>
            <span className="text-xs text-muted ml-2">
              {coupon_type === "free_shipping"
                ? "— Frete grátis"
                : `— Desconto de ${formatCurrency(coupon_discount)}`}
            </span>
          </div>
        </div>
        <button
          onClick={() => { clearCoupon(); setCode(""); }}
          className="text-muted hover:text-danger transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
        <Tag size={16} className="text-accent" />
        Cupom de desconto
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Digite o código"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          error={error}
          className="flex-1 font-mono text-sm uppercase"
        />
        <Button
          variant="outline"
          onClick={handleApply}
          isLoading={loading}
          disabled={!code.trim()}
          className="flex-shrink-0"
        >
          {loading ? "" : "Aplicar"}
        </Button>
      </div>
    </div>
  );
};
