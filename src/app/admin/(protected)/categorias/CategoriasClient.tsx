"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Image from "next/image";
import { Plus, Edit2, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Toggle } from "@/components/common/Toggle";
import { CategoryCircle } from "@/components/public/CategoryCircle";
import { CategoryModal } from "./CategoryModal";
import { toggleCategoryField, deleteCategory } from "@/lib/actions/categories";
import type { Category } from "@/types";

interface Props {
  initialCategories: Category[];
  parentOptions: { value: string; label: string }[];
}

export function CategoriasClient({ initialCategories, parentOptions }: Props) {
  const [categories, setOptimisticCategories] = useOptimistic(initialCategories);
  const [, startTransition] = useTransition();
  // Guarda apenas o ID selecionado, nunca uma cópia da categoria — o objeto
  // em si é sempre derivado da lista viva `categories` abaixo. Antes, este
  // estado guardava o objeto Category inteiro capturado no momento do clique,
  // o que o deixava permanentemente desatualizado após editar/salvar (a
  // categoria mudava na lista, mas o preview continuava com os dados antigos,
  // incluindo a imagem antiga).
  const [previewId, setPreviewId] = useState<string | null>(
    initialCategories[0]?.id ?? null
  );
  const preview = categories.find((c) => c.id === previewId) ?? categories[0] ?? null;
  const [modalCategory, setModalCategory] = useState<Category | undefined>(
    undefined
  );
  const [modalOpen, setModalOpen] = useState(false);

  const handleToggle = (
    id: string,
    field: "is_active" | "is_featured_home",
    current: boolean
  ) => {
    startTransition(async () => {
      setOptimisticCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: !current } : c))
      );
      await toggleCategoryField(id, field, !current);
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"? Esta ação não pode ser desfeita.`))
      return;

    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) alert(result.error);
    });
  };

  const openCreate = () => {
    setModalCategory(undefined);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setModalCategory(cat);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Categorias</h1>
          <p className="text-sm text-muted mt-1">
            {categories.length} categori{categories.length !== 1 ? "as" : "a"} cadastrada{categories.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="accent" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nova categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tabela */}
        <div className="xl:col-span-2">
          <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-alt">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-8" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">
                    Produtos
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Ativa
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">
                    Destaque home
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                )}
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-dark-border last:border-0 hover:bg-dark-hover transition-colors cursor-pointer"
                    onClick={() => setPreviewId(cat.id)}
                  >
                    <td className="px-3 py-3 text-muted">
                      <GripVertical size={14} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cat.image_url && (
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={cat.image_url}
                              alt={cat.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-dark-text flex items-center gap-1.5">
                            {cat.parent_id && <span className="text-muted">↳</span>}
                            {cat.icon && <span className="mr-1">{cat.icon}</span>}
                            {cat.name}
                          </div>
                          <div className="text-xs text-muted">
                            {cat.slug}
                            {cat.parent_id && (
                              <span className="ml-1.5 text-accent/70">
                                · subcategoria de {categories.find((p) => p.id === cat.parent_id)?.name ?? "—"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted hidden sm:table-cell">
                      {cat.product_count ?? 0}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={cat.is_active}
                        onChange={() =>
                          handleToggle(cat.id, "is_active", cat.is_active)
                        }
                        size="sm"
                      />
                    </td>
                    <td
                      className="px-4 py-3 hidden md:table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Toggle
                        checked={cat.is_featured_home}
                        onChange={() =>
                          handleToggle(cat.id, "is_featured_home", cat.is_featured_home)
                        }
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(cat)}
                          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
                        >
                          <Edit2 size={13} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview — o site público só exibe categorias como círculo (Home
            e página de categoria). Não existe nenhum card retangular em
            produção, então mostrar qualquer outro formato aqui seria enganoso. */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Preview — exatamente como aparece no site — clique na linha
          </p>
          {preview && (
            <div className="flex justify-center pointer-events-none">
              <CategoryCircle category={preview} />
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <CategoryModal
          category={modalCategory}
          parentOptions={parentOptions.filter((p) => p.value !== modalCategory?.id)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
