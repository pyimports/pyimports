// Repositório admin — usa service client (bypassa RLS)
// Exclusivo para Server Actions e Server Components do painel admin
// NUNCA importar em componentes "use client"

import { createServiceClient } from "@/lib/supabase/server";
import type { Category, Product, ProductMedia, ProductSpecification, ProductFAQ, ProductAvailability, ProductFulfillmentType, PriceTier } from "@/types";
import type { DbCategory, DbProduct, DbProductMedia } from "@/types/database.types";
import { VARIANT_FIELDS, toVariant, attachStockItemVariants, type VariantRowWithRelations } from "@/lib/db/variant-mappers";

// ---------------------------------------------------------------------------
// Tipos para o admin (inclui campos omitidos na camada pública)
// ---------------------------------------------------------------------------

export interface AdminProduct extends Product {
  cost_price?: number;
  internal_notes?: string;
  stock_minimum: number;
  badge_storage_path?: string;
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

const CATEGORY_FIELDS_ADMIN = `
  id, parent_id, name, slug, short_description, full_description,
  icon, image_url, image_storage_path,
  image_object_position_x, image_object_position_y, image_scale,
  mobile_image_url, mobile_image_storage_path,
  mobile_image_object_position_x, mobile_image_object_position_y, mobile_image_scale,
  gradient, color_accent,
  display_order, is_active, is_featured_home,
  meta_title, meta_description,
  created_at, updated_at
` as const;

function toCategory(row: DbCategory, productCount?: number): Category {
  return {
    id:                        row.id,
    parent_id:                 row.parent_id ?? undefined,
    name:                      row.name,
    slug:                      row.slug,
    short_description:         row.short_description,
    full_description:          row.full_description          ?? undefined,
    icon:                      row.icon                      ?? undefined,
    image_url:                 row.image_url                 ?? undefined,
    image_storage_path:        row.image_storage_path        ?? undefined,
    image_object_position_x:   row.image_object_position_x,
    image_object_position_y:   row.image_object_position_y,
    image_scale:               row.image_scale,
    mobile_image_url:          row.mobile_image_url          ?? undefined,
    mobile_image_storage_path: row.mobile_image_storage_path ?? undefined,
    mobile_image_object_position_x: row.mobile_image_object_position_x,
    mobile_image_object_position_y: row.mobile_image_object_position_y,
    mobile_image_scale:              row.mobile_image_scale,
    gradient:                  row.gradient                  ?? undefined,
    color_accent:              row.color_accent              ?? undefined,
    display_order:             row.display_order,
    is_active:                 row.is_active,
    is_featured_home:          row.is_featured_home,
    meta_title:                row.meta_title                ?? undefined,
    meta_description:          row.meta_description          ?? undefined,
    created_at:                row.created_at,
    updated_at:                row.updated_at,
    product_count:             productCount,
  };
}

// Todas as categorias para o painel admin (ativas + inativas)
export async function getAllCategoriesAdmin(): Promise<Category[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS_ADMIN)
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Conta todos os produtos (ativos + inativos) por categoria
  const { data: counts } = await supabase
    .from("products")
    .select("category_id");

  const countMap = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.category_id] = (acc[r.category_id] ?? 0) + 1;
    return acc;
  }, {});

  return data.map((c) => toCategory(c, countMap[c.id] ?? 0));
}

// Lista todas as categorias para selects genéricos (ex: link de banner —
// um banner pode apontar para uma categoria-pai inteira, como "Masculino").
// Subcategorias usam o rótulo "Pai > Filha" para diferenciar nomes repetidos
// em pais diferentes (ex: "Camisa" em Masculino e em Feminino).
export async function getCategoriesForSelect(): Promise<
  { value: string; label: string }[]
> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name")
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const nameById = new Map(data.map((c) => [c.id, c.name]));

  return data.map((c) => ({
    value: c.id,
    label: c.parent_id ? `${nameById.get(c.parent_id)} > ${c.name}` : c.name,
  }));
}

// Lista só as categorias "folha" (sem subcategorias) — usada no formulário de
// produto e no filtro da listagem de produtos. Um produto nunca é vinculado
// a uma categoria-pai (ex: MASCULINO): ela é só um agrupador de navegação,
// quem recebe produtos de fato são as subcategorias (ex: Camisa, Polo) ou
// uma categoria de topo sem nenhuma subcategoria.
export async function getLeafCategoriesForSelect(): Promise<
  { value: string; label: string }[]
> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name")
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const parentIds = new Set(data.filter((c) => c.parent_id).map((c) => c.parent_id));
  const nameById = new Map(data.map((c) => [c.id, c.name]));

  return data
    .filter((c) => !parentIds.has(c.id)) // exclui quem tem subcategorias
    .map((c) => ({
      value: c.id,
      label: c.parent_id ? `${nameById.get(c.parent_id)} > ${c.name}` : c.name,
    }));
}

export interface CategoryTreeOption {
  value: string;
  label: string;
  children: { value: string; label: string }[];
}

// Árvore Departamento → Subcategoria para o seletor em cascata do formulário
// de produto (ex: escolhe "Masculino", depois aparecem só as subcategorias
// dele: Camisa, Polo). Departamentos sem nenhuma subcategoria funcionam como
// folha — selecioná-los já define o category_id final, sem segundo select.
export async function getCategoryTreeForSelect(): Promise<CategoryTreeOption[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name")
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const topLevel = data.filter((c) => !c.parent_id);

  return topLevel.map((p) => ({
    value: p.id,
    label: p.name,
    children: data
      .filter((c) => c.parent_id === p.id)
      .map((c) => ({ value: c.id, label: c.name })),
  }));
}

// Categorias de topo para o seletor "Categoria pai" — só elas podem ser pai
// (estrutura de 2 níveis: subcategoria não pode ter subcategoria)
export async function getParentCategoriesForSelect(): Promise<
  { value: string; label: string }[]
> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .is("parent_id", null)
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((c) => ({ value: c.id, label: c.name }));
}

// Lista simplificada de produtos para selects (ex: banner/feedback vinculado a produto)
export async function getProductsForSelect(): Promise<
  { value: string; label: string }[]
> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

const PRODUCT_FIELDS_ADMIN = `
  id, name, slug, sku, category_id,
  price_pix, price_card, price_promotional, promotional_active,
  cost_price,
  is_active, is_featured,
  short_description, description, benefits, specifications, faq, warnings,
  stock, stock_minimum, availability, track_stock,
  quantity_pricing_enabled, price_tiers,
  weight_kg, height_cm, width_cm, length_cm, extra_handling_days,
  allow_whatsapp,
  internal_notes,
  meta_title, meta_description,
  badge_image_url, badge_storage_path, badge_position_x, badge_position_y, badge_width_pct,
  show_illustrative_badge, fulfillment_type,
  display_order, stock_item_id,
  created_at, updated_at,
  product_media (
    id, product_id, type, url, thumbnail_url, alt_text,
    display_order, is_main, created_at
  ),
  product_variants ( ${VARIANT_FIELDS} )
` as const;

function toMedia(row: DbProductMedia): ProductMedia {
  return {
    id:            row.id,
    product_id:    row.product_id,
    type:          row.type as "image" | "video",
    url:           row.url,
    thumbnail_url: row.thumbnail_url ?? undefined,
    alt_text:      row.alt_text      ?? undefined,
    display_order: row.display_order,
    is_main:       row.is_main,
    created_at:    row.created_at,
  };
}

type AdminProductRowWithRelations = DbProduct & {
  product_media?: DbProductMedia[];
  product_variants?: VariantRowWithRelations[];
};

function toAdminProduct(row: AdminProductRowWithRelations): AdminProduct {
  return {
    id:                  row.id,
    name:                row.name,
    slug:                row.slug,
    sku:                 row.sku,
    category_id:         row.category_id,
    price_pix:           Number(row.price_pix),
    price_card:          Number(row.price_card),
    price_promotional:   row.price_promotional != null ? Number(row.price_promotional) : undefined,
    promotional_active:  row.promotional_active,
    cost_price:          row.cost_price != null ? Number(row.cost_price) : undefined,
    is_active:           row.is_active,
    is_featured:         row.is_featured,
    short_description:   row.short_description,
    description:         row.description,
    benefits:            row.benefits   ?? undefined,
    warnings:            row.warnings   ?? undefined,
    specifications:      Array.isArray(row.specifications)
                           ? (row.specifications as unknown as ProductSpecification[])
                           : undefined,
    faq:                 Array.isArray(row.faq)
                           ? (row.faq as unknown as ProductFAQ[])
                           : undefined,
    stock:               row.stock,
    stock_minimum:       row.stock_minimum,
    availability:        row.availability   as ProductAvailability,
    track_stock:         row.track_stock,
    quantity_pricing_enabled: row.quantity_pricing_enabled,
    price_tiers:         Array.isArray(row.price_tiers)
                           ? (row.price_tiers as unknown as PriceTier[])
                           : undefined,
    weight_kg:           Number(row.weight_kg),
    height_cm:           Number(row.height_cm),
    width_cm:            Number(row.width_cm),
    length_cm:           Number(row.length_cm),
    extra_handling_days: row.extra_handling_days,
    allow_whatsapp:      row.allow_whatsapp,
    internal_notes:      row.internal_notes  ?? undefined,
    meta_title:          row.meta_title       ?? undefined,
    meta_description:    row.meta_description ?? undefined,
    badge_image_url:     row.badge_image_url    ?? undefined,
    badge_storage_path:  row.badge_storage_path ?? undefined,
    badge_position_x:    row.badge_position_x,
    badge_position_y:    row.badge_position_y,
    badge_width_pct:     row.badge_width_pct,
    show_illustrative_badge: row.show_illustrative_badge,
    fulfillment_type:    row.fulfillment_type as ProductFulfillmentType | null,
    display_order:       row.display_order,
    stock_item_id:       row.stock_item_id ?? undefined,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
    media:               row.product_media
                           ?.slice()
                           .sort((a, b) => a.display_order - b.display_order)
                           .map(toMedia),
    variants:            row.product_variants
                           ?.slice()
                           .sort((a, b) => a.display_order - b.display_order)
                           .map(toVariant),
  };
}

// Todos os produtos para o painel admin (ativos + inativos, com mídia)
export async function getAllProductsAdmin(): Promise<AdminProduct[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS_ADMIN)
    .order("category_id", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) throw error;

  const products = (data ?? []).map((row) =>
    toAdminProduct(row as AdminProductRowWithRelations)
  );
  await attachStockItemVariants(supabase, products);
  return products;
}

// Produto pelo ID para a página de edição (inclui todos os campos)
export async function getProductByIdAdmin(id: string): Promise<AdminProduct | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS_ADMIN)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  if (!data) return null;
  const product = toAdminProduct(data as AdminProductRowWithRelations);
  await attachStockItemVariants(supabase, [product]);
  return product;
}
