"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Star, GripVertical, ImageIcon, Loader2, AlertCircle, Link as LinkIcon } from "lucide-react";
import { toYoutubeEmbedUrl } from "@/lib/formatters";
import { extractDroppedImageUrl } from "@/lib/drag-image-url";
import type { ProductMedia } from "@/types";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface UploadedMedia {
  localId: string;
  dbId?: string;       // product_media.id (para itens já no banco)
  url: string;         // URL pública (ou blob: para pendentes, nunca atingido pois upload é imediato)
  storagePath?: string; // path no Storage (ex: "uuid/arquivo.jpg")
  type: "image" | "video";
  is_main: boolean;
  display_order: number;
  alt_text?: string;
  uploading: boolean;
  uploadError?: string;
}

interface Props {
  productId: string;
  initialMedia?: ProductMedia[];
  /**
   * Imagens já copiadas no Storage mas SEM linha em `product_media` ainda —
   * usado pelo fluxo de "duplicar produto" (rascunho que só grava no banco
   * ao salvar). Tratadas como upload recém-concluído: sem dbId, então
   * remover antes de salvar apaga o arquivo do storage normalmente, e
   * salvar insere como mídia nova.
   */
  prefilledImages?: { url: string; storagePath: string; altText?: string }[];
  onChange: (items: UploadedMedia[], removedDbIds: string[]) => void;
  maxImages?: number;
}

// ---------------------------------------------------------------------------
// Helper: extrai storagePath de uma URL pública do Supabase Storage
// Formato: https://{ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
// ---------------------------------------------------------------------------

function extractStoragePath(url: string, bucket: string): string | undefined {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return undefined;
  return url.slice(idx + marker.length);
}


// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MediaUploader({
  productId,
  initialMedia = [],
  prefilledImages = [],
  onChange,
  maxImages = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(
    () => initialMedia.find((m) => m.type === "video")?.url ?? ""
  );
  const [removedDbIds, setRemovedDbIds] = useState<string[]>([]);

  const [items, setItems] = useState<UploadedMedia[]>(() => {
    if (prefilledImages.length > 0) {
      // Sem dbId de propósito — ainda não existe linha no banco para elas.
      return prefilledImages.map((img, i) => ({
        localId: `prefill-${i}-${Date.now()}`,
        url: img.url,
        storagePath: img.storagePath,
        type: "image" as const,
        is_main: i === 0,
        display_order: i,
        alt_text: img.altText,
        uploading: false,
      }));
    }

    const images = initialMedia
      .filter((m) => m.type === "image")
      .sort((a, b) => a.display_order - b.display_order)
      .map((m, i) => ({
        localId: m.id,
        dbId: m.id,
        url: m.url,
        storagePath: extractStoragePath(m.url, "product-images"),
        type: "image" as const,
        is_main: m.is_main,
        display_order: i,
        alt_text: m.alt_text,
        uploading: false,
      }));
    return images;
  });

  // Notifica parent sempre que items, removedDbIds ou videoUrl mudam
  const notify = useCallback(
    (
      nextItems: UploadedMedia[],
      nextRemoved: string[],
      nextVideoUrl: string
    ) => {
      const reordered = nextItems.map((it, i) => ({
        ...it,
        display_order: i,
        is_main: i === 0,
      }));

      const allMedia: UploadedMedia[] = [...reordered];

      // Inclui vídeo se URL preenchida
      if (nextVideoUrl.trim()) {
        const existingVideo = initialMedia.find((m) => m.type === "video");
        allMedia.push({
          localId: existingVideo?.id ?? `video-${Date.now()}`,
          dbId: existingVideo?.id,
          url: nextVideoUrl.trim(),
          type: "video",
          is_main: false,
          display_order: allMedia.length,
          uploading: false,
        });
      } else {
        // Se havia vídeo no banco e o campo foi limpo, marca para remoção
        const existingVideo = initialMedia.find((m) => m.type === "video");
        if (existingVideo && !nextRemoved.includes(existingVideo.id)) {
          nextRemoved = [...nextRemoved, existingVideo.id];
        }
      }

      onChange(allMedia, nextRemoved);
    },
    [initialMedia, onChange]
  );

  // Notifica o componente pai logo no mount, para que o estado inicial (mídia
  // já existente) fique disponível imediatamente — necessário para o preview
  // em tempo real e para validação de quantidade mínima de imagens no submit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { notify(items, removedDbIds, videoUrl); }, []);

  // Sem isso, soltar o arquivo um pixel fora da área exata do dropzone faz o
  // navegador abrir a imagem direto (navegando pra fora da página) em vez de
  // simplesmente ignorar — o que parece "arrastar não funciona" pro usuário.
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const handleVideoUrl = (v: string) => {
    const normalized = toYoutubeEmbedUrl(v);
    setVideoUrl(normalized);
    notify(items, removedDbIds, normalized);
  };

  // ---------------------------------------------------------------------------
  // Upload de arquivo
  // ---------------------------------------------------------------------------

  const uploadFile = async (file: File) => {
    const localId = `local-${Date.now()}-${Math.random()}`;

    // Adiciona item como "uploading"
    const pending: UploadedMedia = {
      localId,
      url: URL.createObjectURL(file),
      type: "image",
      is_main: false,
      display_order: 0,
      uploading: true,
    };

    setItems((prev) => {
      const next = [...prev, pending];
      notify(next, removedDbIds, videoUrl);
      return next;
    });

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", productId);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setItems((prev) => {
          const next = prev.map((it) =>
            it.localId === localId
              ? { ...it, uploading: false, uploadError: json.error ?? "Erro no upload" }
              : it
          );
          notify(next, removedDbIds, videoUrl);
          return next;
        });
        return;
      }

      setItems((prev) => {
        const next = prev.map((it) =>
          it.localId === localId
            ? {
                ...it,
                url: json.url,
                storagePath: json.storagePath,
                uploading: false,
                uploadError: undefined,
              }
            : it
        );
        notify(next, removedDbIds, videoUrl);
        return next;
      });
    } catch {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.localId === localId
            ? { ...it, uploading: false, uploadError: "Falha na conexão" }
            : it
        );
        notify(next, removedDbIds, videoUrl);
        return next;
      });
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const currentImages = items.length;
    const slots = maxImages - currentImages;
    if (slots <= 0) return;

    Array.from(files)
      .slice(0, slots)
      .forEach((file) => uploadFile(file));
  };

  // Arrastado de outra aba/site (Pinterest, Google Imagens, etc.) — o
  // navegador só entrega o link da imagem, nunca o arquivo em si. O servidor
  // baixa essa imagem e sobe pro Storage, do mesmo jeito que um upload normal.
  const uploadFromUrl = async (url: string) => {
    if (items.length >= maxImages) return;
    const localId = `local-${Date.now()}-${Math.random()}`;

    const pending: UploadedMedia = {
      localId,
      url,
      type: "image",
      is_main: false,
      display_order: 0,
      uploading: true,
    };

    setItems((prev) => {
      const next = [...prev, pending];
      notify(next, removedDbIds, videoUrl);
      return next;
    });

    try {
      const res = await fetch("/api/admin/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, productId }),
      });
      const json = await res.json();

      setItems((prev) => {
        const next = prev.map((it) =>
          it.localId === localId
            ? !res.ok
              ? { ...it, uploading: false, uploadError: json.error ?? "Erro ao baixar imagem" }
              : { ...it, url: json.url, storagePath: json.storagePath, uploading: false, uploadError: undefined }
            : it
        );
        notify(next, removedDbIds, videoUrl);
        return next;
      });
    } catch {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.localId === localId ? { ...it, uploading: false, uploadError: "Falha na conexão" } : it
        );
        notify(next, removedDbIds, videoUrl);
        return next;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Remoção
  // ---------------------------------------------------------------------------

  const removeItem = async (item: UploadedMedia) => {
    if (item.uploading) return;

    if (!item.dbId && item.storagePath) {
      // Upload novo, não salvo no banco — deleta do storage imediatamente
      await fetch(`/api/admin/upload?path=${encodeURIComponent(item.storagePath)}`, {
        method: "DELETE",
      });
    }

    // Calcula items e removedDbIds a partir do MESMO snapshot e dispara um
    // único notify() com os dois valores consistentes entre si. Antes, esta
    // função chamava updateRemoved() (que notificava com `items` ainda
    // contendo o item removido) e depois setItems() (que notificava com
    // `removedDbIds` desatualizado, sem o id recém-marcado) — a segunda
    // chamada sobrescrevia a primeira no componente pai, perdendo o dbId da
    // imagem removida. Resultado: a imagem antiga nunca era excluída do
    // banco e voltava como principal mesmo após salvar uma nova.
    const nextRemoved = item.dbId ? [...removedDbIds, item.dbId] : removedDbIds;
    const nextItems = items.filter((it) => it.localId !== item.localId);

    setRemovedDbIds(nextRemoved);
    setItems(nextItems);
    notify(nextItems, nextRemoved, videoUrl);
  };

  // ---------------------------------------------------------------------------
  // Reordenação — arrastar e soltar, move direto para qualquer posição
  // (ex.: da 5ª direto para a 1ª), em vez de subir/desviar uma posição por vez.
  // ---------------------------------------------------------------------------

  const handleDragStart = (localId: string) => {
    setDraggedId(localId);
  };

  const handleDragOver = (e: React.DragEvent, localId: string) => {
    e.preventDefault();
    if (draggedId && localId !== draggedId && localId !== dragOverId) {
      setDragOverId(localId);
    }
  };

  const handleDragLeave = (localId: string) => {
    setDragOverId((prev) => (prev === localId ? null : prev));
  };

  const handleDrop = (e: React.DragEvent, targetLocalId: string) => {
    e.preventDefault();
    const sourceId = draggedId;
    setDraggedId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetLocalId) return;

    setItems((prev) => {
      const fromIdx = prev.findIndex((it) => it.localId === sourceId);
      const toIdx = prev.findIndex((it) => it.localId === targetLocalId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      notify(arr, removedDbIds, videoUrl);
      return arr;
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // ---------------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------------

  const imageCount = items.length;
  const canAdd = imageCount < maxImages;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canAdd && (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            dragCounter.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            dragCounter.current = Math.max(0, dragCounter.current - 1);
            if (dragCounter.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current = 0;
            setDragging(false);
            if (e.dataTransfer.files.length > 0) {
              handleFiles(e.dataTransfer.files);
            } else {
              const url = extractDroppedImageUrl(e.dataTransfer);
              if (url) uploadFromUrl(url);
            }
          }}
          onClick={() => inputRef.current?.click()}
          className={[
            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150",
            dragging
              ? "border-accent bg-accent/5"
              : "border-dark-border-light hover:border-accent/40 hover:bg-dark-hover",
          ].join(" ")}
        >
          <div className="w-10 h-10 rounded-xl bg-dark-alt flex items-center justify-center">
            <Upload size={20} className="text-muted" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-text">
              Arraste imagens ou clique para selecionar
            </p>
            <p className="text-xs text-muted mt-1">
              PNG, JPG, WEBP — máx. 5 MB por imagem · {imageCount}/{maxImages} adicionadas
            </p>
            <p className="text-xs text-muted/70 mt-0.5">
              Recomendado: 1200×1200px (proporção 1:1), mínimo 800×800px
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Grade de imagens */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div
              key={item.localId}
              draggable={!item.uploading && !item.uploadError}
              onDragStart={() => handleDragStart(item.localId)}
              onDragOver={(e) => handleDragOver(e, item.localId)}
              onDragLeave={() => handleDragLeave(item.localId)}
              onDrop={(e) => handleDrop(e, item.localId)}
              onDragEnd={handleDragEnd}
              className={[
                "relative group aspect-square bg-dark-alt rounded-xl overflow-hidden border transition-all",
                draggedId === item.localId
                  ? "opacity-40 border-accent"
                  : dragOverId === item.localId
                  ? "border-accent ring-2 ring-accent/50"
                  : "border-dark-border",
                !item.uploading && !item.uploadError ? "cursor-grab active:cursor-grabbing" : "",
              ].join(" ")}
            >
              {item.uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={24} className="text-accent animate-spin" />
                </div>
              ) : item.uploadError ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                  <AlertCircle size={20} className="text-danger" />
                  <p className="text-xs text-danger text-center leading-tight">
                    {item.uploadError}
                  </p>
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt_text ?? `Imagem ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}

              {/* Controles — visíveis no hover */}
              {!item.uploading && !item.uploadError && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  {/* Indicador de arrastar — a imagem inteira é arrastável */}
                  <div
                    className="absolute left-1 top-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center pointer-events-none"
                    title="Arraste para reordenar"
                  >
                    <GripVertical size={12} className="text-white" />
                  </div>

                  {/* Remover */}
                  <button
                    onClick={() => removeItem(item)}
                    className="absolute top-1 right-1 w-5 h-5 bg-danger rounded flex items-center justify-center hover:bg-danger/80"
                    title="Remover"
                  >
                    <X size={11} className="text-white" />
                  </button>
                </div>
              )}

              {/* Badge de erro (mesmo sem hover) */}
              {item.uploadError && (
                <button
                  onClick={() => removeItem(item)}
                  className="absolute top-1 right-1 w-5 h-5 bg-danger rounded flex items-center justify-center"
                >
                  <X size={11} className="text-white" />
                </button>
              )}

              {/* Badge "Principal" (primeiro da lista) */}
              {i === 0 && !item.uploading && !item.uploadError && (
                <div className="absolute bottom-0 left-0 right-0 py-1 bg-black/60 text-center pointer-events-none">
                  <span className="text-xs text-accent font-semibold flex items-center justify-center gap-1">
                    <Star size={10} className="fill-accent" />
                    Principal
                  </span>
                </div>
              )}

              {/* Slots vazios */}
              {!item.url && !item.uploading && (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={20} className="text-muted/40" />
                </div>
              )}
            </div>
          ))}

          {/* Slot vazio de convite (se há espaço e menos de 3 na linha atual) */}
          {canAdd && items.length % 3 !== 0 &&
            Array.from({ length: 3 - (items.length % 3) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square bg-dark-alt rounded-xl border border-dashed border-dark-border flex items-center justify-center"
              >
                <ImageIcon size={20} className="text-muted/30" />
              </div>
            ))}
        </div>
      )}

      {items.length > 1 && (
        <p className="text-xs text-muted">
          Arraste uma imagem para reordenar — a primeira da lista é definida como principal automaticamente.
        </p>
      )}

      {/* Campo de vídeo (URL YouTube embed) */}
      <div className="pt-2 border-t border-dark-border">
        <label className="flex items-center gap-1.5 text-xs font-medium text-dark-text mb-1.5">
          <LinkIcon size={12} className="text-muted" />
          Vídeo — URL do YouTube (opcional)
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => handleVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/embed/..."
          className="w-full bg-dark-alt border border-dark-border-light rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
        />
        <p className="text-xs text-muted mt-1">
          Use o formato embed: youtube.com/embed/VIDEO_ID
        </p>
      </div>
    </div>
  );
}
