"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateQuantityDiscountPrice, INSURANCE_PERCENTAGE } from "@/lib/pricing";
import type { CartItem, CartState, ShippingOption, CouponType } from "@/types";

const UNLIMITED_STOCK_CAP = 9999;

function maxQuantityFor(item: Pick<CartItem, "track_stock" | "stock">): number {
  return item.track_stock ? item.stock ?? 0 : UNLIMITED_STOCK_CAP;
}

// Uma linha do carrinho é identificada por produto + variação (cor/tamanho).
// variant_size_id já identifica a combinação cor+tamanho sozinho — não
// precisa comparar cor e tamanho separadamente.
function sameLine(a: Pick<CartItem, "product_id" | "variant_size_id">, b: Pick<CartItem, "product_id" | "variant_size_id">): boolean {
  return a.product_id === b.product_id && (a.variant_size_id ?? null) === (b.variant_size_id ?? null);
}

// Resolve o preço unitário efetivo para uma quantidade.
// O step é SEMPRE 10 — nunca derivado do conteúdo de price_tiers.
// price_tiers serve apenas como flag: "tem desconto progressivo ou não".
function resolveUnitPrice(
  item: Pick<CartItem, "base_price_pix" | "price_tiers">,
  quantity: number
): number {
  if (!item.price_tiers || item.price_tiers.length === 0) {
    return item.base_price_pix;
  }
  return calculateQuantityDiscountPrice({
    basePrice: item.base_price_pix,
    quantity,
  }).unitPrice;
}

interface CartActions {
  addItem:          (item: CartItem) => void;
  removeItem:       (productId: string, variantSizeId?: string) => void;
  updateQuantity:   (productId: string, quantity: number, variantSizeId?: string) => void;
  clearCart:        () => void;
  setShipping:      (option: ShippingOption) => void;
  clearShipping:    () => void;
  setCoupon:        (code: string, discount: number, type: CouponType) => void;
  clearCoupon:      () => void;
  setInsurance:     (enabled: boolean) => void;
  getSubtotal:      () => number;
  getShippingValue: () => number;
  getCouponDiscount:() => number;
  getInsuranceValue:() => number;
  getTotalPix:      () => number;
  getTotalCard:     () => number;
  getItemCount:     () => number;
}

const initialState: CartState = {
  items:             [],
  shipping_option:   null,
  coupon_code:       null,
  coupon_discount:   0,
  coupon_type:       undefined,
  insurance_enabled: false,
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (item: CartItem) => {
        const { items } = get();
        const existing  = items.find((i) => sameLine(i, item));

        if (existing) {
          set({
            items: items.map((i) => {
              if (!sameLine(i, item)) return i;
              const max      = maxQuantityFor(item);
              const quantity = Math.min(i.quantity + item.quantity, max);
              return {
                ...i,
                stock:          item.stock,
                track_stock:    item.track_stock,
                base_price_pix: item.base_price_pix,
                price_tiers:    item.price_tiers,
                quantity,
                price_pix: resolveUnitPrice(item, quantity),
              };
            }),
          });
        } else {
          const max      = maxQuantityFor(item);
          const quantity = Math.min(item.quantity, max);
          set({
            items: [
              ...items,
              {
                ...item,
                quantity,
                price_pix: resolveUnitPrice(item, quantity),
              },
            ],
          });
        }
      },

      removeItem: (productId: string, variantSizeId?: string) => {
        set({
          items: get().items.filter(
            (i) => !sameLine(i, { product_id: productId, variant_size_id: variantSizeId })
          ),
        });
      },

      updateQuantity: (productId: string, quantity: number, variantSizeId?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantSizeId);
          return;
        }
        set({
          items: get().items.map((i) => {
            if (!sameLine(i, { product_id: productId, variant_size_id: variantSizeId })) return i;
            const capped = Math.min(quantity, maxQuantityFor(i));
            return {
              ...i,
              quantity:  capped,
              price_pix: resolveUnitPrice(i, capped),
            };
          }),
        });
      },

      clearCart: () => set(initialState),

      setShipping:  (option) => set({ shipping_option: option }),
      clearShipping: ()      => set({ shipping_option: null }),

      setCoupon: (code, discount, type) =>
        set({ coupon_code: code, coupon_discount: discount, coupon_type: type }),
      clearCoupon: () =>
        set({ coupon_code: null, coupon_discount: 0, coupon_type: undefined }),

      setInsurance: (enabled) => set({ insurance_enabled: enabled }),

      getSubtotal: () =>
        get().items.reduce((acc, item) => acc + item.price_pix * item.quantity, 0),

      getShippingValue: () => {
        const { shipping_option, coupon_type } = get();
        if (!shipping_option) return 0;
        if (coupon_type === "free_shipping") return 0;
        return shipping_option.price;
      },

      getCouponDiscount: () => {
        const { coupon_discount, coupon_type } = get();
        if (coupon_type === "free_shipping") return get().shipping_option?.price ?? 0;
        return coupon_discount;
      },

      getInsuranceValue: () => {
        const { insurance_enabled } = get();
        if (!insurance_enabled) return 0;
        return get().getSubtotal() * INSURANCE_PERCENTAGE;
      },

      getTotalPix: () => {
        const subtotal  = get().getSubtotal();
        const shipping  = get().getShippingValue();
        const discount  = get().getCouponDiscount();
        const insurance = get().getInsuranceValue();
        return Math.max(0, subtotal + shipping + insurance - discount);
      },

      getTotalCard: () => {
        const { items }    = get();
        const subtotalCard = items.reduce((acc, i) => acc + i.price_card * i.quantity, 0);
        const shipping     = get().getShippingValue();
        const discount     = get().getCouponDiscount();
        const insurance    = get().getInsuranceValue();
        return Math.max(0, subtotalCard + shipping + insurance - discount);
      },

      getItemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    {
      name: "cart-store",
      partialize: (state) => ({
        items:             state.items,
        shipping_option:   state.shipping_option,
        coupon_code:       state.coupon_code,
        coupon_discount:   state.coupon_discount,
        coupon_type:       state.coupon_type,
        insurance_enabled: state.insurance_enabled,
      }),
    }
  )
);
