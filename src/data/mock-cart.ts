import type { CartItem, ShippingOption } from "@/types";

export const mockCartItems: CartItem[] = [
  {
    product_id: "prod-1",
    product_name: "Camiseta Básica Masculina — Preta",
    product_slug: "camiseta-basica-masculina-preta",
    product_sku: "CAM-MASC-PRETA-001",
    product_image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200",
    price_pix: 89.90,
    base_price_pix: 89.90,
    price_card: 94.90,
    quantity: 1,
    track_stock: true,
    stock: 40,
  },
  {
    product_id: "prod-3",
    product_name: "Camiseta Básica Feminina — Branca",
    product_slug: "camiseta-basica-feminina-branca",
    product_sku: "CAM-FEM-BRANCA-001",
    product_image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=200",
    price_pix: 84.90,
    base_price_pix: 84.90,
    price_card: 89.90,
    quantity: 1,
    track_stock: true,
    stock: 35,
  },
];

export const mockSelectedShipping: ShippingOption = {
  code: "SEDEX",
  name: "SEDEX",
  carrier: "Correios",
  price: 34.50,
  delivery_days: 2,
  description: "Entrega expressa pelos Correios",
};
