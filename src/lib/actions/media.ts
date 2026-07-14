"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminWrite } from "@/lib/auth/admin-guard";
import type { UploadedMedia } from "@/components/admin/MediaUploader";

const BUCKET = "product-images";
const STORAGE_MARKER = `/storage/v1/object/public/${BUCKET}/`;

function extractStoragePath(url: string): string | undefined {
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return undefined;
  return url.slice(idx + STORAGE_MARKER.length);
}

// ---------------------------------------------------------------------------
// saveMediaChanges
// Persiste toda a mídia de um produto após create/update.
// - removedDbIds: IDs do product_media a excluir (imagens e vídeos do banco)
// - items: estado final (imagens já no storage + vídeo URL)
//
// IMPORTANTE: toda chamada ao Supabase aqui verifica `error` e retorna
// imediatamente em caso de falha. Antes, nenhuma chamada checava o erro —
// um insert/update que falhasse (ex.: violação do índice único que garante
// uma única imagem `is_main = true` por produto) era silenciosamente
// ignorado, e a função retornava sucesso mesmo sem persistir a imagem nova.
// ---------------------------------------------------------------------------

export async function saveMediaChanges(
  productId: string,
  items: UploadedMedia[],
  removedDbIds: string[]
): Promise<{ error?: string }> {
  const guard = await requireAdminWrite();
  if ("error" in guard) return guard;
  const service = createServiceClient();

  // Valida regras de quantidade no servidor — o client já impede isso na UI,
  // mas a action pode ser chamada diretamente, então a regra real fica aqui.
  const finalImageCount = items.filter((it) => it.type === "image" && !it.uploadError).length;
  const finalVideoCount = items.filter((it) => it.type === "video").length;
  if (finalImageCount < 1) return { error: "O produto precisa de pelo menos 1 imagem." };
  if (finalImageCount > 5) return { error: "O produto pode ter no máximo 5 imagens." };
  if (finalVideoCount > 1) return { error: "O produto pode ter no máximo 1 vídeo." };

  // 1. Excluir mídias removidas
  if (removedDbIds.length > 0) {
    const { data: toRemove, error: fetchError } = await service
      .from("product_media")
      .select("id, url, type")
      .in("id", removedDbIds);

    if (fetchError) return { error: `Erro ao buscar mídias para remover: ${fetchError.message}` };

    if (toRemove) {
      const imageUrls = toRemove.filter((m) => m.type === "image").map((m) => m.url);

      // Defesa contra exclusão cruzada: nunca apagar um arquivo do storage se
      // QUALQUER outro produto (ou outra linha não marcada para remoção)
      // ainda referencia a mesma URL. Isso já causou um incidente real —
      // produtos duplicados antes de uma correção anterior compartilhavam a
      // mesma URL de imagem, e remover a imagem da cópia apagava o arquivo
      // físico que o produto original também usava, quebrando a imagem dele.
      // Mesmo cuidado agora pra product_variant_media: produto "tamanho
      // único" espelha a foto principal na mídia da variante (mesmo
      // arquivo) — sem checar essa tabela também, remover a foto principal
      // apagava o arquivo que a variante ainda usava na PDP.
      let referencedElsewhere = new Set<string>();
      if (imageUrls.length > 0) {
        const { data: stillUsed } = await service
          .from("product_media")
          .select("id, url")
          .in("url", imageUrls);
        const { data: stillUsedInVariants } = await service
          .from("product_variant_media")
          .select("url")
          .in("url", imageUrls);
        referencedElsewhere = new Set([
          ...(stillUsed ?? [])
            .filter((row) => !removedDbIds.includes(row.id))
            .map((row) => row.url),
          ...(stillUsedInVariants ?? []).map((row) => row.url),
        ]);
      }

      const storagePaths = toRemove
        .filter((m) => m.type === "image" && !referencedElsewhere.has(m.url))
        .map((m) => extractStoragePath(m.url))
        .filter((p): p is string => !!p);

      if (storagePaths.length > 0) {
        const { error: storageError } = await service.storage.from(BUCKET).remove(storagePaths);
        if (storageError) return { error: `Erro ao remover arquivos do storage: ${storageError.message}` };
      }
    }

    const { error: deleteError } = await service
      .from("product_media")
      .delete()
      .in("id", removedDbIds);
    if (deleteError) return { error: `Erro ao remover mídias do banco: ${deleteError.message}` };
  }

  // 2. Zera is_main de TODAS as imagens existentes do produto antes de
  // reaplicar os valores corretos — evita qualquer violação transitória do
  // índice único "uma imagem principal por produto" (idx_product_media_main),
  // independente da ordem de update/insert que vier a seguir.
  const { error: clearMainError } = await service
    .from("product_media")
    .update({ is_main: false })
    .eq("product_id", productId)
    .eq("type", "image");
  if (clearMainError) return { error: `Erro ao preparar imagem principal: ${clearMainError.message}` };

  // 3. Atualizar itens existentes (têm dbId)
  const existingItems = items.filter((it) => it.dbId && it.type === "image");
  for (const item of existingItems) {
    const { error: updateError } = await service
      .from("product_media")
      .update({
        is_main: item.is_main,
        display_order: item.display_order,
        alt_text: item.alt_text ?? null,
      })
      .eq("id", item.dbId!);
    if (updateError) return { error: `Erro ao atualizar imagem: ${updateError.message}` };
  }

  // 4. Inserir novas imagens (sem dbId, já no storage)
  const newImages = items.filter(
    (it) => !it.dbId && it.type === "image" && it.url.startsWith("https") && !it.uploading && !it.uploadError
  );
  if (newImages.length > 0) {
    const { error: insertError } = await service.from("product_media").insert(
      newImages.map((it) => ({
        product_id: productId,
        type: "image" as const,
        url: it.url,
        is_main: it.is_main,
        display_order: it.display_order,
        alt_text: it.alt_text ?? null,
      }))
    );
    if (insertError) return { error: `Erro ao salvar imagem nova: ${insertError.message}` };
  }

  // 5. Salvar vídeo (URL externa)
  const videoItem = items.find((it) => it.type === "video");
  if (videoItem) {
    if (videoItem.dbId) {
      const { error: videoUpdateError } = await service
        .from("product_media")
        .update({ url: videoItem.url })
        .eq("id", videoItem.dbId);
      if (videoUpdateError) return { error: `Erro ao atualizar vídeo: ${videoUpdateError.message}` };
    } else {
      const { error: videoInsertError } = await service.from("product_media").insert({
        product_id: productId,
        type: "video" as const,
        url: videoItem.url,
        is_main: false,
        display_order: videoItem.display_order,
      });
      if (videoInsertError) return { error: `Erro ao salvar vídeo: ${videoInsertError.message}` };
    }
  }

  // Forma explícita documentada pelo Next.js para revalidar TODAS as
  // instâncias de uma rota dinâmica — mais confiável do que depender da
  // semântica de cascata do tipo "layout" para acertar /produtos/[slug].
  revalidatePath(`/admin/produtos/${productId}/editar`);
  revalidatePath("/produtos/[slug]", "page");
  revalidatePath("/categoria/[slug]", "page");
  revalidatePath("/");

  return {};
}
