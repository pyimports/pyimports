"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminWrite } from "@/lib/auth/admin-guard";
import type { PriceTier, ProductSpecification, ProductFulfillmentType } from "@/types";
import type { Json } from "@/types/database.types";

const PRODUCT_IMAGES_BUCKET = "product-images";
const PRODUCT_IMAGES_MARKER = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;

function extractProductImagePath(url: string): string | undefined {
  const idx = url.indexOf(PRODUCT_IMAGES_MARKER);
  if (idx === -1) return undefined;
  return url.slice(idx + PRODUCT_IMAGES_MARKER.length);
}

// ---------------------------------------------------------------------------
// Tipos do formulário
// ---------------------------------------------------------------------------

export interface ProductFormData {
  id?: string; // UUID pré-gerado pelo cliente (para vincular uploads antes do INSERT)
  name: string;
  slug: string;
  sku: string;
  // Quando preenchido, cor/tamanho/imagens deste produto vêm desta peça do
  // estoque (stock_items), não de product_variants.product_id direto.
  stock_item_id?: string | null;
  category_id: string;
  price_pix: number;
  price_card: number;
  price_promotional?: number | null;
  promotional_active: boolean;
  is_active: boolean;
  is_featured: boolean;
  short_description: string;
  description: string;
  benefits?: string;
  warnings?: string;
  specifications?: ProductSpecification[];
  stock: number | null;
  stock_minimum: number;
  track_stock: boolean;
  quantity_pricing_enabled: boolean;
  price_tiers?: PriceTier[];
  weight_kg: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
  extra_handling_days: number;
  allow_whatsapp: boolean;
  meta_title?: string;
  meta_description?: string;
  badge_image_url?: string | null;
  badge_storage_path?: string | null;
  badge_position_x?: number;
  badge_position_y?: number;
  badge_width_pct?: number;
  show_illustrative_badge: boolean;
  fulfillment_type?: ProductFulfillmentType | null;
}

// ---------------------------------------------------------------------------
// Disponibilidade calculada — elimina divergência Admin x Loja: o admin não
// escolhe manualmente o status, ele é derivado de estoque/controle de estoque.
// ---------------------------------------------------------------------------

function computeAvailability(
  data: Pick<ProductFormData, "track_stock" | "stock" | "stock_minimum">
): "in_stock" | "low_stock" | "out_of_stock" {
  if (!data.track_stock) return "in_stock"; // estoque ilimitado
  const stock = data.stock ?? 0;
  if (stock <= 0) return "out_of_stock";
  if (stock <= data.stock_minimum) return "low_stock";
  return "in_stock";
}

function sanitizeSpecifications(
  specs: ProductSpecification[] | undefined
): Json | null {
  const cleaned = (specs ?? []).filter(
    (s) => s.label.trim() && s.value.trim()
  );
  return cleaned.length > 0 ? (cleaned as unknown as Json) : null;
}

function sanitizePriceTiers(
  enabled: boolean,
  tiers: PriceTier[] | undefined
): Json | null {
  if (!enabled) return null;
  const cleaned = (tiers ?? [])
    .filter((t) => t.quantity > 1 && t.unit_price > 0)
    .sort((a, b) => a.quantity - b.quantity);
  return cleaned.length > 0 ? (cleaned as unknown as Json) : null;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function toggleProductField(
  id: string,
  field: "is_active" | "is_featured",
  value: boolean
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const supabase = createServiceClient();

  const updateData =
    field === "is_active" ? { is_active: value } : { is_featured: value };

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/produtos");
  return {};
}

export async function createProduct(
  data: ProductFormData
): Promise<{ error?: string; id?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!data.name.trim()) return { error: "Nome é obrigatório." };
  if (!data.slug.trim()) return { error: "Slug é obrigatório." };
  if (!data.sku.trim()) return { error: "SKU é obrigatório." };
  if (!data.category_id) return { error: "Categoria é obrigatória." };
  if (data.track_stock && (data.stock === null || data.stock === undefined)) {
    return { error: "Informe o estoque ou desative o controle de estoque." };
  }

  const supabase = createServiceClient();

  // Novo produto entra no final da ordem manual da categoria — nunca na
  // frente de produtos já organizados pelo admin via drag-and-drop.
  const { count: existingCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", data.category_id);

  const { data: row, error } = await supabase
    .from("products")
    .insert({
      ...(data.id ? { id: data.id } : {}),
      display_order:       existingCount ?? 0,
      name:                data.name.trim(),
      slug:                data.slug.trim(),
      sku:                 data.sku.trim(),
      stock_item_id:       data.stock_item_id ?? null,
      category_id:         data.category_id,
      price_pix:           data.price_pix,
      price_card:          data.price_card,
      price_promotional:   data.price_promotional ?? null,
      promotional_active:  data.promotional_active,
      is_active:           data.is_active,
      is_featured:         data.is_featured,
      short_description:   data.short_description.trim(),
      description:         data.description.trim(),
      benefits:            data.benefits?.trim() || null,
      warnings:            data.warnings?.trim() || null,
      specifications:      sanitizeSpecifications(data.specifications),
      stock:               data.track_stock ? data.stock : null,
      stock_minimum:       data.stock_minimum,
      track_stock:         data.track_stock,
      availability:        computeAvailability(data),
      quantity_pricing_enabled: data.quantity_pricing_enabled,
      price_tiers:         sanitizePriceTiers(data.quantity_pricing_enabled, data.price_tiers),
      weight_kg:           data.weight_kg,
      height_cm:           data.height_cm,
      width_cm:            data.width_cm,
      length_cm:           data.length_cm,
      extra_handling_days: data.extra_handling_days,
      allow_whatsapp:      data.allow_whatsapp,
      meta_title:          data.meta_title?.trim()       || null,
      meta_description:    data.meta_description?.trim() || null,
      badge_image_url:     data.badge_image_url    ?? null,
      badge_storage_path:  data.badge_storage_path ?? null,
      badge_position_x:    data.badge_position_x   ?? 50,
      badge_position_y:    data.badge_position_y   ?? 50,
      badge_width_pct:     data.badge_width_pct     ?? 25,
      show_illustrative_badge: data.show_illustrative_badge,
      fulfillment_type:    data.fulfillment_type ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("stock_item")) {
      return { error: "Esta peça do estoque já está vinculada a outro produto." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos/[slug]", "page");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/");
  return { id: row?.id };
}

export async function updateProduct(
  id: string,
  data: ProductFormData
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!data.name.trim()) return { error: "Nome é obrigatório." };
  if (!data.slug.trim()) return { error: "Slug é obrigatório." };
  if (!data.sku.trim()) return { error: "SKU é obrigatório." };
  if (data.track_stock && (data.stock === null || data.stock === undefined)) {
    return { error: "Informe o estoque ou desative o controle de estoque." };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({
      name:                data.name.trim(),
      slug:                data.slug.trim(),
      sku:                 data.sku.trim(),
      stock_item_id:       data.stock_item_id ?? null,
      category_id:         data.category_id,
      price_pix:           data.price_pix,
      price_card:          data.price_card,
      price_promotional:   data.price_promotional ?? null,
      promotional_active:  data.promotional_active,
      is_active:           data.is_active,
      is_featured:         data.is_featured,
      short_description:   data.short_description.trim(),
      description:         data.description.trim(),
      benefits:            data.benefits?.trim() || null,
      warnings:            data.warnings?.trim() || null,
      specifications:      sanitizeSpecifications(data.specifications),
      stock:               data.track_stock ? data.stock : null,
      stock_minimum:       data.stock_minimum,
      track_stock:         data.track_stock,
      availability:        computeAvailability(data),
      quantity_pricing_enabled: data.quantity_pricing_enabled,
      price_tiers:         sanitizePriceTiers(data.quantity_pricing_enabled, data.price_tiers),
      weight_kg:           data.weight_kg,
      height_cm:           data.height_cm,
      width_cm:            data.width_cm,
      length_cm:           data.length_cm,
      extra_handling_days: data.extra_handling_days,
      allow_whatsapp:      data.allow_whatsapp,
      meta_title:          data.meta_title?.trim()       || null,
      meta_description:    data.meta_description?.trim() || null,
      badge_image_url:     data.badge_image_url    ?? null,
      badge_storage_path:  data.badge_storage_path ?? null,
      badge_position_x:    data.badge_position_x   ?? 50,
      badge_position_y:    data.badge_position_y   ?? 50,
      badge_width_pct:     data.badge_width_pct     ?? 25,
      show_illustrative_badge: data.show_illustrative_badge,
      fulfillment_type:    data.fulfillment_type ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505" && error.message.includes("stock_item")) {
      return { error: "Esta peça do estoque já está vinculada a outro produto." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}/editar`);
  revalidatePath("/produtos/[slug]", "page");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/");
  return {};
}

// ---------------------------------------------------------------------------
// copyProductImagesForDraft — usado pelo fluxo de "duplicar produto".
//
// IMPORTANTE: esta função NÃO grava nada em nenhuma tabela (nem `products`
// nem `product_media`). Ela só copia os ARQUIVOS de imagem do produto de
// origem para uma pasta nova no Storage (a do rascunho que ainda não existe
// no banco). O rascunho só é persistido quando o admin clicar em "Salvar"
// no formulário de novo produto — exatamente como uma criação normal, onde
// imagens já podem estar no storage antes do INSERT do produto.
//
// Por que copiar o ARQUIVO em vez de só a URL: copiar só a referência já
// causou um incidente real — ao remover uma imagem herdada da cópia, o
// storage apagava o arquivo físico, e como o produto original referenciava
// o mesmo path, a imagem dele quebrava também. Copiando o arquivo, cada
// produto sempre tem seu próprio arquivo, nunca compartilhado.
// ---------------------------------------------------------------------------

export async function copyProductImagesForDraft(
  sourceProductId: string,
  draftProductId: string
): Promise<{ error?: string; images?: { url: string; storagePath: string; altText?: string }[] }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const supabase = createServiceClient();

  const { data: media, error } = await supabase
    .from("product_media")
    .select("url, type, alt_text")
    .eq("product_id", sourceProductId)
    .eq("type", "image")
    .order("display_order", { ascending: true });

  if (error) return { error: error.message };

  const images: { url: string; storagePath: string; altText?: string }[] = [];

  for (const m of media ?? []) {
    const sourcePath = extractProductImagePath(m.url);
    if (!sourcePath) continue; // URL externa não reconhecida no bucket — pula

    const ext = sourcePath.split(".").pop()?.toLowerCase() ?? "jpg";
    const destPath = `${draftProductId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: copyError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .copy(sourcePath, destPath);
    if (copyError) continue; // não trava a duplicação inteira por uma imagem

    const { data: { publicUrl } } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(destPath);

    images.push({ url: publicUrl, storagePath: destPath, altText: m.alt_text ?? undefined });
  }

  return { images };
}

// ---------------------------------------------------------------------------
// getProductDataForDuplication — busca os campos de texto/preço/config do
// produto de origem para pré-preencher o formulário de novo produto. Apenas
// leitura — nenhuma escrita acontece aqui.
// ---------------------------------------------------------------------------

export interface ProductDuplicationData {
  name: string;
  category_id: string;
  price_pix: number;
  price_card: number;
  price_promotional: number | null;
  promotional_active: boolean;
  short_description: string;
  description: string;
  benefits: string | null;
  warnings: string | null;
  specifications: ProductSpecification[];
  stock: number | null;
  stock_minimum: number;
  track_stock: boolean;
  quantity_pricing_enabled: boolean;
  price_tiers: PriceTier[];
  weight_kg: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
  extra_handling_days: number;
  allow_whatsapp: boolean;
  show_illustrative_badge: boolean;
  fulfillment_type?: ProductFulfillmentType | null;
}

export async function getProductDataForDuplication(
  id: string
): Promise<ProductDuplicationData | null> {
  await requireAdmin(); // leitura — qualquer papel autenticado, inclusive viewer
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      name, category_id,
      price_pix, price_card, price_promotional, promotional_active,
      short_description, description, benefits, specifications, warnings,
      stock, stock_minimum, track_stock,
      quantity_pricing_enabled, price_tiers,
      weight_kg, height_cm, width_cm, length_cm, extra_handling_days,
      allow_whatsapp, show_illustrative_badge, fulfillment_type
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    name:                data.name,
    category_id:         data.category_id,
    price_pix:           Number(data.price_pix),
    price_card:          Number(data.price_card),
    price_promotional:   data.price_promotional != null ? Number(data.price_promotional) : null,
    promotional_active:  data.promotional_active,
    short_description:   data.short_description,
    description:         data.description,
    benefits:            data.benefits,
    warnings:            data.warnings,
    specifications:      Array.isArray(data.specifications)
                           ? (data.specifications as unknown as ProductSpecification[])
                           : [],
    stock:               data.stock,
    stock_minimum:       data.stock_minimum,
    track_stock:         data.track_stock,
    quantity_pricing_enabled: data.quantity_pricing_enabled,
    price_tiers:         Array.isArray(data.price_tiers)
                           ? (data.price_tiers as unknown as PriceTier[])
                           : [],
    weight_kg:           Number(data.weight_kg),
    height_cm:           Number(data.height_cm),
    width_cm:            Number(data.width_cm),
    length_cm:           Number(data.length_cm),
    extra_handling_days: data.extra_handling_days,
    allow_whatsapp:      data.allow_whatsapp,
    show_illustrative_badge: data.show_illustrative_badge,
    fulfillment_type:    data.fulfillment_type as ProductFulfillmentType | null,
  };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const supabase = createServiceClient();

  // Guarda a mídia antes de excluir, para limpar os arquivos do storage depois
  const { data: media } = await supabase
    .from("product_media")
    .select("url, type")
    .eq("product_id", id);

  // Remove mídia associada antes de remover o produto
  await supabase.from("product_media").delete().eq("product_id", id);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  // Limpa os arquivos de imagem do storage — só se nenhum OUTRO produto
  // ainda referenciar a mesma URL. Esta consulta roda DEPOIS de remover as
  // linhas de product_media deste produto, então qualquer resultado
  // encontrado pertence necessariamente a outro produto.
  const imageUrls = (media ?? []).filter((m) => m.type === "image").map((m) => m.url);
  if (imageUrls.length > 0) {
    const { data: stillUsed } = await supabase
      .from("product_media")
      .select("url")
      .in("url", imageUrls);
    const referencedElsewhere = new Set((stillUsed ?? []).map((r) => r.url));
    const pathsToDelete = imageUrls
      .filter((url) => !referencedElsewhere.has(url))
      .map((url) => extractProductImagePath(url))
      .filter((p): p is string => !!p);
    if (pathsToDelete.length > 0) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(pathsToDelete);
    }
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos/[slug]", "page");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/");
  return {};
}

// ---------------------------------------------------------------------------
// reorderProducts — persiste a nova ordem de exibição dos produtos de UMA
// categoria, definida por drag-and-drop no painel admin. `orderedIds` é a
// lista completa de IDs da categoria na ordem final desejada; cada produto
// recebe display_order = sua posição (índice) nessa lista.
// ---------------------------------------------------------------------------

export async function reorderProducts(
  categoryId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const supabase = createServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("products")
        .update({ display_order: index })
        .eq("id", id)
        .eq("category_id", categoryId)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/admin/produtos");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/produtos/[slug]", "page");
  revalidatePath("/");
  return {};
}
