import type { Coupon } from "@/types";

export const mockCoupons: Coupon[] = [
  {
    id: "coup-1",
    code: "BEMVINDO10",
    description_internal: "Cupom de boas-vindas para novos clientes — 10% off",
    type: "percentage",
    value: 10,
    is_active: true,
    start_date: "2025-01-01",
    expiration_date: "2025-12-31",
    max_uses_total: 500,
    max_uses_per_customer: 1,
    min_order_value: 200,
    uses_count: 87,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "coup-2",
    code: "PROMO15",
    description_internal: "Promoção junho — 15% em moletons",
    type: "percentage",
    value: 15,
    is_active: true,
    start_date: "2025-06-01",
    expiration_date: "2025-06-30",
    max_uses_total: 100,
    max_uses_per_customer: 2,
    min_order_value: 400,
    categories: ["cat-moletom-feminino"],
    uses_count: 23,
    created_at: "2025-06-01T00:00:00Z",
  },
  {
    id: "coup-3",
    code: "FRETEGRATIS",
    description_internal: "Frete grátis sem valor mínimo",
    type: "free_shipping",
    value: 0,
    is_active: true,
    expiration_date: "2025-07-31",
    max_uses_per_customer: 1,
    uses_count: 41,
    created_at: "2025-05-01T00:00:00Z",
  },
  {
    id: "coup-4",
    code: "DESCONTO50",
    description_internal: "R$50 de desconto em pedidos acima de R$500",
    type: "fixed",
    value: 50,
    is_active: true,
    expiration_date: "2025-08-31",
    min_order_value: 500,
    uses_count: 15,
    created_at: "2025-04-01T00:00:00Z",
  },
  {
    id: "coup-5",
    code: "JULIANA10",
    description_internal: "Cupom exclusivo para Juliana Ferreira — cliente VIP",
    type: "percentage",
    value: 10,
    is_active: true,
    expiration_date: "2025-07-14",
    max_uses_total: 3,
    max_uses_per_customer: 3,
    customer_specific_id: "cust-1",
    customer_specific_name: "Juliana Ferreira",
    uses_count: 1,
    created_at: "2025-06-10T10:00:00Z",
  },
  {
    id: "coup-6",
    code: "BLACKFRIDAY2024",
    description_internal: "Black Friday 2024 — 20% em tudo",
    type: "percentage",
    value: 20,
    is_active: false,
    start_date: "2024-11-29",
    expiration_date: "2024-11-30",
    max_uses_total: 1000,
    uses_count: 234,
    created_at: "2024-11-01T00:00:00Z",
  },
];

export const getCouponByCode = (code: string): Coupon | undefined =>
  mockCoupons.find((c) => c.code.toLowerCase() === code.toLowerCase());

export const getActiveCoupons = (): Coupon[] =>
  mockCoupons.filter((c) => c.is_active);

export const getClientCoupons = (clientId: string): Coupon[] =>
  mockCoupons.filter((c) => c.customer_specific_id === clientId);
