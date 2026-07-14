// Mapeamento compartilhado de cor/imagem/tamanho — usado tanto por produtos
// (src/lib/db/products.ts, público) quanto pelo admin (src/lib/db/admin.ts e
// src/lib/db/stock.ts), evitando manter 3 cópias da mesma lógica.

import type { ProductVariant, ProductVariantMedia, ProductVariantSize } from "@/types";
import type { DbProductVariant, DbProductVariantMedia, DbProductVariantSize } from "@/types/database.types";

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XXG"];

export function sortSizes(sizes: ProductVariantSize[]): ProductVariantSize[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.size.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.size.toUpperCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function toVariantMedia(row: DbProductVariantMedia): ProductVariantMedia {
  return {
    id:            row.id,
    variant_id:    row.variant_id,
    url:           row.url,
    storage_path:  row.storage_path ?? undefined,
    is_main:       row.is_main,
    is_hover:      row.is_hover,
    display_order: row.display_order,
    created_at:    row.created_at,
  };
}

export function toVariantSize(row: DbProductVariantSize): ProductVariantSize {
  return {
    id:              row.id,
    variant_id:      row.variant_id,
    size:            row.size,
    stock:           row.stock,
    sku:             row.sku ?? undefined,
    low_stock_alert: row.low_stock_alert,
    is_active:       row.is_active,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  };
}

export type VariantRowWithRelations = DbProductVariant & {
  product_variant_media?: DbProductVariantMedia[];
  product_variant_sizes?: DbProductVariantSize[];
};

export function toVariant(row: VariantRowWithRelations): ProductVariant {
  return {
    id:            row.id,
    product_id:    row.product_id ?? undefined,
    stock_item_id: row.stock_item_id ?? undefined,
    color_name:    row.color_name,
    color_hex:     row.color_hex,
    display_order: row.display_order,
    is_active:     row.is_active,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
    media: (row.product_variant_media ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map(toVariantMedia),
    sizes: sortSizes((row.product_variant_sizes ?? []).map(toVariantSize)),
  };
}

// Campos completos de uma variante (cor) + suas imagens e tamanhos — usado
// tanto no embed `product_variants ( ${VARIANT_FIELDS} )` dentro de uma query
// de produtos, quanto numa query direta `from("product_variants").select(...)`
// filtrando por stock_item_id.
export const VARIANT_FIELDS = `
  id, product_id, stock_item_id, color_name, color_hex, display_order, is_active, created_at, updated_at,
  product_variant_media ( id, variant_id, url, storage_path, is_main, is_hover, display_order, created_at ),
  product_variant_sizes ( id, variant_id, size, stock, sku, low_stock_alert, is_active, created_at, updated_at )
` as const;

// ---------------------------------------------------------------------------
// attachStockItemVariants — para produtos com stock_item_id preenchido, o
// embed `product_variants(...)` da query principal vem vazio (a variante
// pertence à peça, não ao produto). Esta função busca essas variantes numa
// query separada e substitui `.variants` desses produtos.
//
// Quando o produto tem curadoria (`product_colors`), usa SÓ as cores
// escolhidas pelo admin, na ordem escolhida, com a principal sempre em
// primeiro lugar (índice 0 — é o que ProductPdpClient usa como seleção
// padrão, então a loja pública não precisa de nenhuma alteração) e com
// `.media` vindo de `product_color_images` (snapshot por produto) em vez de
// `product_variant_media` (Estoque). `.sizes` e identidade da cor continuam
// 100% vivos de product_variants/product_variant_sizes — nunca duplicados.
//
// Sem curadoria (não deveria acontecer depois do backfill da migration 016,
// mas serve de defesa para nunca renderizar um produto publicado vazio),
// cai no comportamento legado: todas as cores ativas da peça, na ordem dela.
// ---------------------------------------------------------------------------

// Tipagem deliberadamente solta — esta função recebe tanto o client anon
// (createClient(), async) quanto o service role (createServiceClient(),
// síncrono), que têm tipos genéricos diferentes pra .from()/.select() apesar
// da mesma forma em runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

interface DbProductColorImageRow {
  id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
  is_hover: boolean;
  display_order: number;
}

interface DbProductColorRow {
  id: string;
  product_id: string;
  variant_id: string;
  display_order: number;
  is_main: boolean;
  product_color_images: DbProductColorImageRow[];
}

const PRODUCT_COLOR_FIELDS = `
  id, product_id, variant_id, display_order, is_main,
  product_color_images ( id, url, storage_path, is_primary, is_hover, display_order )
` as const;

function colorImagesToVariantMedia(variantId: string, images: DbProductColorImageRow[]): ProductVariantMedia[] {
  return images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => ({
      id:            img.id,
      variant_id:    variantId,
      url:           img.url,
      storage_path:  img.storage_path ?? undefined,
      is_main:       img.is_primary,
      is_hover:      img.is_hover,
      display_order: img.display_order,
      created_at:    "", // não usado pela loja pública nem pelo Admin a partir dessa origem
    }));
}

export async function attachStockItemVariants<
  T extends { id?: string; stock_item_id?: string; variants?: ProductVariant[] }
>(supabase: AnySupabaseClient, items: T[]): Promise<void> {
  const stockItemIds = Array.from(
    new Set(items.map((p) => p.stock_item_id).filter((id): id is string => !!id))
  );
  if (stockItemIds.length === 0) return;

  const { data } = await supabase
    .from("product_variants")
    .select(VARIANT_FIELDS)
    .in("stock_item_id", stockItemIds);

  const byStockItem = new Map<string, VariantRowWithRelations[]>();
  for (const row of data ?? []) {
    const key = row.stock_item_id!;
    if (!byStockItem.has(key)) byStockItem.set(key, []);
    byStockItem.get(key)!.push(row);
  }

  const productIds = items.map((i) => i.id).filter((id): id is string => !!id);
  const colorsByProduct = new Map<string, DbProductColorRow[]>();
  if (productIds.length > 0) {
    const { data: colorRows } = await supabase
      .from("product_colors")
      .select(PRODUCT_COLOR_FIELDS)
      .in("product_id", productIds);
    for (const row of (colorRows ?? []) as DbProductColorRow[]) {
      if (!colorsByProduct.has(row.product_id)) colorsByProduct.set(row.product_id, []);
      colorsByProduct.get(row.product_id)!.push(row);
    }
  }

  for (const item of items) {
    if (!item.stock_item_id) continue;
    const allVariants = (byStockItem.get(item.stock_item_id) ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    const curated = item.id ? colorsByProduct.get(item.id) ?? [] : [];

    if (curated.length > 0) {
      item.variants = curated
        .slice()
        .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.display_order - b.display_order)
        .map((color) => {
          const variantRow = allVariants.find((v) => v.id === color.variant_id);
          if (!variantRow) return null; // cor curada cuja variante foi removida do Estoque — cascade ainda não rodou/refletiu
          const variant = toVariant(variantRow);
          return { ...variant, media: colorImagesToVariantMedia(variant.id, color.product_color_images) };
        })
        .filter((v): v is ProductVariant => v !== null);
    } else {
      item.variants = allVariants.map(toVariant);
    }
  }
}
