"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CartItem } from "@/components/public/CartItem";
import { CouponInput } from "@/components/public/CouponInput";
import { InsuranceOption } from "@/components/public/InsuranceOption";
import { formatCurrency } from "@/lib/formatters";
import { useCartStore } from "@/store/cart-store";
import { routes } from "@/lib/routes";

interface CartSummaryProps {
  showCoupon: boolean;
}

export const CartSummary = ({ showCoupon }: CartSummaryProps) => {
  // Aguarda a hidratação do Zustand persist antes de renderizar o conteúdo.
  // Sem isso, o servidor renderiza com store vazio (items: []) enquanto o
  // cliente tem dados do localStorage — mismatch que causava re-render em
  // cascata e travamento ao navegar para/de esta página.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const {
    items,
    getSubtotal,
    getCouponDiscount,
    getInsuranceValue,
    getTotalPix,
    getTotalCard,
    coupon_code,
  } = useCartStore();

  if (!mounted) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const couponVisible = showCoupon || !!coupon_code;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-5 text-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 bg-accent/5 rounded-full border border-accent/15 shadow-[0_0_40px_rgba(59, 130, 246,0.1)]" />
          <div className="absolute inset-3 bg-dark-alt rounded-full flex items-center justify-center">
            <ShoppingBag size={32} className="text-muted" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-dark-text">Seu carrinho está vazio</h3>
          <p className="text-muted text-sm mt-1.5">Adicione produtos para continuar</p>
        </div>
        <Link href={routes.home}>
          <Button variant="accent" size="lg" className="shadow-[0_6px_24px_rgba(59, 130, 246,0.3)]">
            Ver produtos
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal       = getSubtotal();
  const couponDiscount = getCouponDiscount();
  const insuranceValue = getInsuranceValue();
  const totalPix       = getTotalPix();
  const totalCard      = getTotalCard();

  // Soma das economias por desconto de quantidade em todos os itens
  const quantityDiscountTotal = items.reduce(
    (acc, item) => acc + Math.max(0, (item.base_price_pix - item.price_pix) * item.quantity),
    0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-semibold text-dark-text">
          Itens do carrinho ({items.length})
        </h2>
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-4">
          {items.map((item) => (
            <CartItem key={`${item.product_id}-${item.variant_size_id ?? "simple"}`} item={item} />
          ))}
        </div>

        {/* Cupom só aparece se existir algum cupom ativo (showCoupon,
            calculado no server) OU se o cliente já estiver com um aplicado
            (mesmo que tenha sido desativado depois, ele continua podendo
            ver/remover). Sem isso, some, pra não poluir a tela de quem não
            tem nenhum cupom pra usar. */}
        {couponVisible && (
          <div className="bg-dark-surface rounded-2xl border border-dark-border p-4">
            <CouponInput />
          </div>
        )}

        <InsuranceOption />
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-dark-text">Resumo do pedido</h2>
        <div className="relative bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-3 sticky top-24 overflow-hidden">
          {/* Gold top accent */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-dark-text font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {quantityDiscountTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Desconto por quantidade</span>
              <span className="text-success font-semibold">−{formatCurrency(quantityDiscountTotal)}</span>
            </div>
          )}

          {coupon_code && couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Cupom ({coupon_code})</span>
              <span className="text-success font-semibold">−{formatCurrency(couponDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">Seguro da mercadoria</span>
            <span className={insuranceValue > 0 ? "text-dark-text font-medium" : "text-success font-semibold"}>
              {insuranceValue > 0 ? formatCurrency(insuranceValue) : "Grátis"}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Envio (Shopee)</span>
              <span className="text-dark-text font-medium">R$ 50,00</span>
            </div>
            <p className="text-[11px] text-muted/70 mt-0.5">Pagamento separado, pós finalização do pedido</p>
          </div>

          <div className="border-t border-dark-border/70 pt-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-dark-text">Total no Pix</span>
              <span className="text-2xl font-bold text-dark-text tracking-tight">{formatCurrency(totalPix)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>No cartão de crédito</span>
              <span className="font-medium">{formatCurrency(totalCard)}</span>
            </div>
          </div>

          <Link href={routes.checkout}>
            <Button
              variant="accent"
              fullWidth
              size="lg"
              className="mt-1 shadow-[0_6px_24px_rgba(59, 130, 246,0.3)] hover:shadow-[0_8px_32px_rgba(59, 130, 246,0.45)]"
            >
              Continuar para checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
