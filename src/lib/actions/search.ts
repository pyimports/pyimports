"use server";

import { searchProducts } from "@/lib/db/products";

export interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  price_pix: number;
  price_promotional?: number;
  promotional_active: boolean;
}

// Busca pública de produtos (sem login, sem rate-limit — só leitura de
// dados já públicos). Retorna um formato enxuto, só o necessário pro
// dropdown de resultados na navbar.
export async function searchProductsAction(query: string): Promise<ProductSearchResult[]> {
  const products = await searchProducts(query, 8);

  return products.map((p) => {
    const mainImage = p.media?.find((m) => m.is_main && m.type === "image") ?? p.media?.[0];
    return {
      id:                  p.id,
      name:                p.name,
      slug:                p.slug,
      image_url:           mainImage?.url,
      price_pix:           p.price_pix,
      price_promotional:   p.price_promotional,
      promotional_active:  p.promotional_active,
    };
  });
}
