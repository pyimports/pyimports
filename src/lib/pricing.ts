import type { PriceTier } from "@/types";

// Seguro da mercadoria — % sobre o subtotal da compra, cobre reenvio em caso
// de extravio/avaria. Opcional, escolhido pelo cliente no carrinho.
// Compartilhado entre client (cart-store) e server (checkout) para nunca divergir.
export const INSURANCE_PERCENTAGE = 0.25;

// ── Resolve o preço base efetivo para 1 unidade ──────────────────────────────
// Retorna price_promotional quando há campanha ativa, senão price_pix.
// É a única fonte de verdade para o preço de partida do desconto progressivo.

export type ProductPricingSource = {
  price_pix?: number | null;
};

// price_pix é SEMPRE o preço de venda atual (o que o cliente paga).
// price_promotional é o preço ANTERIOR riscado — serve apenas para badge visual.
// Nunca use price_promotional como basePrice de cálculo.
export function resolveBasePrice(product: ProductPricingSource): number {
  return Math.max(0, Number(product.price_pix) || 0);
}

// ── Fórmula canônica de desconto progressivo por quantidade ──────────────────
//
//   unitPrice   = basePrice - ((quantity - 1) * discountPerLevel)
//   total       = quantity  * unitPrice
//   fullPrice   = quantity  * basePrice      ← referência sem desconto
//   savings     = fullPrice - total
//   unitSavings = basePrice - unitPrice
//
// O desconto aplica-se em TODAS as unidades, não apenas na adicional.
// Não há limite de quantidade — cresce indefinidamente.
//
// Exemplos (basePrice=650, discountPerLevel=10):
//   qty 1 → unit 650,  total  650,  savings   0,  unitSavings  0
//   qty 2 → unit 640,  total 1280,  savings  20,  unitSavings 10
//   qty 3 → unit 630,  total 1890,  savings  60,  unitSavings 20
//   qty 4 → unit 620,  total 2480,  savings 120,  unitSavings 30
//   qty 5 → unit 610,  total 3050,  savings 200,  unitSavings 40
//   qty 6 → unit 600,  total 3600,  savings 300,  unitSavings 50
//   qty 7 → unit 590,  total 4130,  savings 420,  unitSavings 60
//   qty 8 → unit 580,  total 4640,  savings 560,  unitSavings 70

export interface QuantityDiscountResult {
  basePrice:        number;
  quantity:         number;
  discountPerLevel: number;
  unitPrice:        number;
  fullPrice:        number;
  total:            number;
  savings:          number;
  unitSavings:      number;
}

export function calculateQuantityDiscountPrice(params: {
  basePrice:         number;
  quantity:          number;
  discountPerLevel?: number;
  minUnitPrice?:     number;
}): QuantityDiscountResult {
  const {
    basePrice,
    quantity,
    discountPerLevel = 10,
    minUnitPrice     = 1,
  } = params;

  const safeBasePrice        = Math.max(0, Number(basePrice)        || 0);
  const safeQuantity         = Math.max(1, Math.floor(Number(quantity) || 1));
  const safeDiscountPerLevel = Math.max(0, Number(discountPerLevel) || 0);

  const rawUnitPrice = safeBasePrice - (safeQuantity - 1) * safeDiscountPerLevel;
  const unitPrice    = Math.max(minUnitPrice, rawUnitPrice);

  const fullPrice   = safeQuantity * safeBasePrice;
  const total       = safeQuantity * unitPrice;
  const savings     = Math.max(0, fullPrice - total);
  const unitSavings = Math.max(0, safeBasePrice - unitPrice);

  return {
    basePrice: safeBasePrice,
    quantity:  safeQuantity,
    discountPerLevel: safeDiscountPerLevel,
    unitPrice,
    fullPrice,
    total,
    savings,
    unitSavings,
  };
}

// ── Wrapper backward-compatible (checkout.ts / cart-store) ───────────────────
// tiers = flag "produto tem desconto progressivo". Step é sempre 10, nunca
// derivado do conteúdo dos tiers (esse era o bug anterior).
export function getTierUnitPrice(
  basePrice: number,
  tiers:     PriceTier[] | undefined,
  quantity:  number
): number {
  if (!tiers || tiers.length === 0) return basePrice;
  return calculateQuantityDiscountPrice({ basePrice, quantity }).unitPrice;
}

// ── Breakpoints de exibição (BannerSlide / admin preview) ───────────────────
// Os tiers definem apenas QUAIS quantidades mostrar; preço calculado pela fórmula.
export interface QuantityPriceOption {
  quantity:  number;
  unitPrice: number;
  total:     number;
  savings:   number;
}

export function buildQuantityPriceOptions(
  basePrice: number,
  tiers:     PriceTier[] | undefined
): QuantityPriceOption[] {
  const base: QuantityPriceOption = {
    quantity: 1, unitPrice: basePrice, total: basePrice, savings: 0,
  };
  if (!tiers || tiers.length === 0) return [base];

  const qtys = [1, ...[...tiers]
    .sort((a, b) => a.quantity - b.quantity)
    .map((t) => t.quantity)
    .filter((q) => q > 1)];

  return qtys.map((qty) => {
    const r = calculateQuantityDiscountPrice({ basePrice, quantity: qty });
    return { quantity: qty, unitPrice: r.unitPrice, total: r.total, savings: r.savings };
  });
}
