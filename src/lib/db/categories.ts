// Repositório de categorias — leituras via anon key (RLS aplicada)
// Usar apenas em Server Components, Route Handlers e Server Actions

import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types";
import type { DbCategory } from "@/types/database.types";

const CATEGORY_FIELDS = `
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

// Busca a imagem principal do primeiro produto de cada categoria
// — usado como fallback quando a categoria não tem image_url própria
async function fetchFirstProductImages(
  categoryIds: string[]
): Promise<Record<string, string>> {
  if (categoryIds.length === 0) return {};

  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("id, category_id, product_media(url, is_main, display_order)")
    .eq("is_active", true)
    .in("category_id", categoryIds);

  if (!data) return {};

  type MediaRow = { url: string; is_main: boolean; display_order: number };
  type ProductRow = { id: string; category_id: string; product_media: MediaRow[] | null };

  const result: Record<string, string> = {};

  for (const raw of data) {
    const row = raw as unknown as ProductRow;
    if (result[row.category_id]) continue;

    const media = row.product_media ?? [];
    const sorted = [...media].sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return a.display_order - b.display_order;
    });

    if (sorted[0]?.url) {
      result[row.category_id] = sorted[0].url;
    }
  }

  return result;
}

// Conta produtos ativos por categoria em uma única query
async function fetchProductCounts(
  categoryIds: string[]
): Promise<Record<string, number>> {
  if (categoryIds.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("category_id")
    .eq("is_active", true)
    .in("category_id", categoryIds);

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.category_id] = (acc[row.category_id] ?? 0) + 1;
    return acc;
  }, {});
}

function toCategory(row: DbCategory, productCount?: number): Category {
  return {
    id:                row.id,
    parent_id:         row.parent_id ?? undefined,
    name:              row.name,
    slug:              row.slug,
    short_description: row.short_description,
    full_description:  row.full_description  ?? undefined,
    icon:              row.icon              ?? undefined,
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
    color_accent:      row.color_accent      ?? undefined,
    display_order:     row.display_order,
    is_active:         row.is_active,
    is_featured_home:  row.is_featured_home,
    meta_title:        row.meta_title        ?? undefined,
    meta_description:  row.meta_description  ?? undefined,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    product_count:     productCount,
  };
}

// Categorias em destaque para a Home (is_featured_home = true, ordenadas por display_order)
export async function getFeaturedCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("is_active", true)
    .eq("is_featured_home", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const counts     = await fetchProductCounts(data.map((c) => c.id));
  const categories = data.map((c) => toCategory(c, counts[c.id] ?? 0));

  // Categorias sem image_url própria recebem a imagem do primeiro produto
  const idsWithoutImage = categories.filter((c) => !c.image_url).map((c) => c.id);
  const firstProductImages =
    idsWithoutImage.length > 0 ? await fetchFirstProductImages(idsWithoutImage) : {};

  return categories.map((c) => ({
    ...c,
    first_product_image_url: firstProductImages[c.id],
  }));
}

// Todas as categorias ativas para o Catálogo
export async function getAllActiveCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const counts     = await fetchProductCounts(data.map((c) => c.id));
  const categories = data.map((c) => toCategory(c, counts[c.id] ?? 0));

  // Categorias sem image_url própria recebem a imagem do primeiro produto
  const idsWithoutImage = categories.filter((c) => !c.image_url).map((c) => c.id);
  const firstProductImages =
    idsWithoutImage.length > 0 ? await fetchFirstProductImages(idsWithoutImage) : {};

  return categories.map((c) => ({
    ...c,
    first_product_image_url: firstProductImages[c.id],
  }));
}

// Categoria pelo slug (para /categoria/[slug] e breadcrumb de produto)
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }

  return data ? toCategory(data) : null;
}

// Categorias de topo (parent_id = null) — alimenta o menu (Navbar/Footer)
export async function getTopLevelCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .is("parent_id", null)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((c) => toCategory(c));
}

// Subcategorias ativas de uma categoria-pai (para a página /categoria/[slug])
export async function getChildCategories(parentId: string): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const counts = await fetchProductCounts(data.map((c) => c.id));
  const categories = data.map((c) => toCategory(c, counts[c.id] ?? 0));

  const idsWithoutImage = categories.filter((c) => !c.image_url).map((c) => c.id);
  const firstProductImages =
    idsWithoutImage.length > 0 ? await fetchFirstProductImages(idsWithoutImage) : {};

  return categories.map((c) => ({
    ...c,
    first_product_image_url: firstProductImages[c.id],
  }));
}
