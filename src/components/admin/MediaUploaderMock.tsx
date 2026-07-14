"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, GripVertical } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  name: string;
}

interface MediaUploaderMockProps {
  initialItems?: MediaItem[];
  onChange?: (items: MediaItem[]) => void;
  maxItems?: number;
}

export const MediaUploaderMock = ({
  initialItems = [],
  onChange,
  maxItems = 6,
}: MediaUploaderMockProps) => {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (next: MediaItem[]) => {
    setItems(next);
    onChange?.(next);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxItems - items.length;
    const toAdd = Array.from(files).slice(0, remaining);

    const newItems: MediaItem[] = toAdd.map((file) => ({
      id: `mock-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    update([...items, ...newItems]);
  };

  const remove = (id: string) => {
    update(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {items.length < maxItems && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
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
              PNG, JPG, WEBP — máx. {maxItems} imagens
            </p>
            <p className="text-xs text-warning/80 mt-1">
              (Mock — as imagens não são salvas no servidor)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Thumbnails */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group aspect-square bg-dark-alt rounded-xl overflow-hidden border border-dark-border"
            >
              <Image
                src={item.url}
                alt={item.name}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Drag handle (visual only) */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-5 h-5 bg-black/50 rounded flex items-center justify-center">
                  <GripVertical size={11} className="text-white" />
                </div>
              </div>
              {/* Remove */}
              <button
                onClick={() => remove(item.id)}
                className="absolute top-1 right-1 w-5 h-5 bg-danger rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover imagem"
              >
                <X size={11} className="text-white" />
              </button>
              {/* First = main */}
              {items[0].id === item.id && (
                <div className="absolute bottom-0 left-0 right-0 py-1 bg-black/60 text-center">
                  <span className="text-xs text-accent font-semibold">Principal</span>
                </div>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, maxItems - items.length) })
            .slice(0, 3 - (items.length % 3 || 3))
            .map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square bg-dark-alt rounded-xl border border-dashed border-dark-border flex items-center justify-center"
              >
                <ImageIcon size={20} className="text-muted/40" />
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
