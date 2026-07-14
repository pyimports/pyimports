import { createClient } from "@/lib/supabase/server";
import type { HomeBanner, PriceTier } from "@/types";

export async function getActiveBanners(): Promise<HomeBanner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_banners")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  const banners = (data ?? []) as HomeBanner[];

  // Para banners apontando para produto com promoção por quantidade, busca o
  // preço/tiers do produto vinculado — o admin não digita esses valores.
  const productIds = banners
    .filter((b) => b.link_type === "product" && b.link_product_id)
    .map((b) => b.link_product_id as string);

  if (productIds.length === 0) return banners;

  const { data: products } = await supabase
    .from("products")
    .select("id, price_pix, quantity_pricing_enabled, price_tiers")
    .in("id", productIds);

  const productMap = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        price_pix: Number(p.price_pix),
        quantity_pricing_enabled: p.quantity_pricing_enabled,
        price_tiers: Array.isArray(p.price_tiers)
          ? (p.price_tiers as unknown as PriceTier[])
          : undefined,
      },
    ])
  );

  return banners.map((b) =>
    b.link_type === "product" && b.link_product_id && productMap.has(b.link_product_id)
      ? { ...b, linked_product: productMap.get(b.link_product_id) }
      : b
  );
}
