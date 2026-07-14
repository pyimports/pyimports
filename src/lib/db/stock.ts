// Repositório de peças de estoque (stock_items) — usa service client
// (bypassa RLS), exclusivo para Server Components/Actions do painel admin.

import { createServiceClient } from "@/lib/supabase/server";
import { VARIANT_FIELDS, toVariant } from "@/lib/db/variant-mappers";
import type { StockItem } from "@/types";
import type { DbStockItem } from "@/types/database.types";
import type { VariantRowWithRelations } from "@/lib/db/variant-mappers";

const STOCK_ITEM_FIELDS = `
  id, name, base_sku, category_id, is_active, created_at, updated_at,
  product_variants ( ${VARIANT_FIELDS} ),
  products ( id, name, slug )
` as const;

type StockItemRow = DbStockItem & {
  product_variants?: VariantRowWithRelations[];
  products?: { id: string; name: string; slug: string }[];
};

function toStockItem(row: StockItemRow): StockItem {
  return {
    id:          row.id,
    name:        row.name,
    base_sku:    row.base_sku,
    category_id: row.category_id ?? undefined,
    is_active:   row.is_active,
    variants: (row.product_variants ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map(toVariant),
    linked_product: row.products?.[0]
      ? { id: row.products[0].id, name: row.products[0].name, slug: row.products[0].slug }
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getStockItemByIdAdmin(id: string): Promise<StockItem | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("stock_items")
    .select(STOCK_ITEM_FIELDS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data ? toStockItem(data as StockItemRow) : null;
}

export interface StockItemSearchResult {
  id: string;
  name: string;
  base_sku: string;
  colorCount: number;
  skuCount: number;
  totalStock: number;
  linkedProductId?: string;
}

// Busca peças por nome/SKU base — usado pelo picker "vincular produto a uma
// peça do estoque". Inclui peças já vinculadas (linkedProductId preenchido)
// pra a UI poder desabilitá-las, exceto a do próprio produto em edição.
export async function searchStockItemsForLink(term: string): Promise<StockItemSearchResult[]> {
  const supabase = createServiceClient();
  const cleaned = term.trim();

  let query = supabase
    .from("stock_items")
    .select(`
      id, name, base_sku, is_active,
      product_variants ( id, product_variant_sizes ( stock ) ),
      products ( id )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(15);

  if (cleaned) {
    query = query.or(`name.ilike.%${cleaned}%,base_sku.ilike.%${cleaned}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  type Row = {
    id: string;
    name: string;
    base_sku: string;
    product_variants?: { id: string; product_variant_sizes?: { stock: number }[] }[];
    products?: { id: string }[];
  };

  return ((data ?? []) as Row[]).map((row) => {
    const variants = row.product_variants ?? [];
    const sizes = variants.flatMap((v) => v.product_variant_sizes ?? []);
    return {
      id: row.id,
      name: row.name,
      base_sku: row.base_sku,
      colorCount: variants.length,
      skuCount: sizes.length,
      totalStock: sizes.reduce((sum, s) => sum + s.stock, 0),
      linkedProductId: row.products?.[0]?.id,
    };
  });
}

