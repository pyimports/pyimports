"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminWrite } from "@/lib/auth/admin-guard";

// ---------------------------------------------------------------------------
// Tipos dos formulários
// ---------------------------------------------------------------------------

export interface CategoryFormData {
  parent_id?: string | null;
  name: string;
  slug: string;
  short_description: string;
  full_description?: string;
  icon?: string;
  gradient?: string;
  color_accent?: string;
  display_order: number;
  is_active: boolean;
  is_featured_home: boolean;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
  image_storage_path?: string;
  image_object_position_x?: number;
  image_object_position_y?: number;
  image_scale?: number;
  mobile_image_url?: string;
  mobile_image_storage_path?: string;
  mobile_image_object_position_x?: number;
  mobile_image_object_position_y?: number;
  mobile_image_scale?: number;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function toggleCategoryField(
  id: string,
  field: "is_active" | "is_featured_home",
  value: boolean
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const supabase = createServiceClient();

  const updateData =
    field === "is_active"
      ? { is_active: value }
      : { is_featured_home: value };

  const { error } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/categorias");
  return {};
}

export async function createCategory(
  data: CategoryFormData
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!data.name.trim()) return { error: "Nome é obrigatório." };
  if (!data.slug.trim()) return { error: "Slug é obrigatório." };

  const supabase = createServiceClient();

  if (data.parent_id) {
    const { data: parent } = await supabase
      .from("categories")
      .select("parent_id")
      .eq("id", data.parent_id)
      .single();
    if (parent?.parent_id) {
      return { error: "Só é permitido um nível de subcategoria — a categoria escolhida como pai já é uma subcategoria." };
    }
  }

  const { error } = await supabase.from("categories").insert({
    parent_id:                 data.parent_id || null,
    name:                      data.name.trim(),
    slug:                      data.slug.trim(),
    short_description:         data.short_description.trim(),
    full_description:          data.full_description?.trim()          || null,
    icon:                      data.icon?.trim()                      || null,
    gradient:                  data.gradient?.trim()                  || null,
    color_accent:              data.color_accent?.trim()              || null,
    display_order:             data.display_order,
    is_active:                 data.is_active,
    is_featured_home:          data.is_featured_home,
    meta_title:                data.meta_title?.trim()                || null,
    meta_description:          data.meta_description?.trim()          || null,
    image_url:                 data.image_url                         || null,
    image_storage_path:        data.image_storage_path                || null,
    image_object_position_x:   data.image_object_position_x           ?? 50,
    image_object_position_y:   data.image_object_position_y           ?? 50,
    image_scale:                data.image_scale                       ?? 1,
    mobile_image_url:          data.mobile_image_url                  || null,
    mobile_image_storage_path: data.mobile_image_storage_path         || null,
    mobile_image_object_position_x: data.mobile_image_object_position_x ?? 50,
    mobile_image_object_position_y: data.mobile_image_object_position_y ?? 50,
    mobile_image_scale:              data.mobile_image_scale             ?? 1,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return {};
}

export async function updateCategory(
  id: string,
  data: CategoryFormData
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  if (!data.name.trim()) return { error: "Nome é obrigatório." };
  if (!data.slug.trim()) return { error: "Slug é obrigatório." };

  const supabase = createServiceClient();

  if (data.parent_id === id) return { error: "Uma categoria não pode ser pai dela mesma." };

  if (data.parent_id) {
    const { data: parent } = await supabase
      .from("categories")
      .select("parent_id")
      .eq("id", data.parent_id)
      .single();
    if (parent?.parent_id) {
      return { error: "Só é permitido um nível de subcategoria — a categoria escolhida como pai já é uma subcategoria." };
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      parent_id:                 data.parent_id || null,
      name:                      data.name.trim(),
      slug:                      data.slug.trim(),
      short_description:         data.short_description.trim(),
      full_description:          data.full_description?.trim()          || null,
      icon:                      data.icon?.trim()                      || null,
      gradient:                  data.gradient?.trim()                  || null,
      color_accent:              data.color_accent?.trim()              || null,
      display_order:             data.display_order,
      is_active:                 data.is_active,
      is_featured_home:          data.is_featured_home,
      meta_title:                data.meta_title?.trim()                || null,
      meta_description:          data.meta_description?.trim()          || null,
      image_url:                 data.image_url                         || null,
      image_storage_path:        data.image_storage_path                || null,
      image_object_position_x:   data.image_object_position_x           ?? 50,
      image_object_position_y:   data.image_object_position_y           ?? 50,
      image_scale:                data.image_scale                       ?? 1,
      mobile_image_url:          data.mobile_image_url                  || null,
      mobile_image_storage_path: data.mobile_image_storage_path         || null,
      mobile_image_object_position_x: data.mobile_image_object_position_x ?? 50,
      mobile_image_object_position_y: data.mobile_image_object_position_y ?? 50,
      mobile_image_scale:              data.mobile_image_scale             ?? 1,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;

  const supabase = createServiceClient();

  // Bloqueia exclusão se houver produtos vinculados
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return { error: "Não é possível excluir uma categoria com produtos vinculados." };
  }

  // Bloqueia exclusão se houver subcategorias vinculadas
  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if ((childCount ?? 0) > 0) {
    return { error: "Não é possível excluir uma categoria com subcategorias vinculadas." };
  }

  // Busca storage paths antes de deletar para limpeza posterior
  const { data: catData } = await supabase
    .from("categories")
    .select("image_storage_path, mobile_image_storage_path")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  // Limpa arquivos do bucket (não bloqueia operação se falhar)
  const pathsToDelete: string[] = [];
  if (catData?.image_storage_path) pathsToDelete.push(catData.image_storage_path);
  if (catData?.mobile_image_storage_path) pathsToDelete.push(catData.mobile_image_storage_path);
  if (pathsToDelete.length > 0) {
    await supabase.storage.from("category-images").remove(pathsToDelete);
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return {};
}
