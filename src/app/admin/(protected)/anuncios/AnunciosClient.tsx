"use client";

import React, { useState, useEffect, useOptimistic, useTransition } from "react";
import { Plus, Edit2, Trash2, AlertCircle, Megaphone, Tag, Info } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Toggle } from "@/components/common/Toggle";
import { Modal } from "@/components/common/Modal";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/types";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
} from "@/lib/actions/announcements";
import type { Announcement, AnnouncementType } from "@/types";
import type { AnnouncementFormData } from "@/lib/actions/announcements";

interface Props {
  initialAnnouncements: Announcement[];
}

const TYPE_OPTIONS = [
  { value: "promocao", label: ANNOUNCEMENT_TYPE_LABELS.promocao },
  { value: "cupom",    label: ANNOUNCEMENT_TYPE_LABELS.cupom },
  { value: "aviso",    label: ANNOUNCEMENT_TYPE_LABELS.aviso },
];

const TYPE_ICON: Record<AnnouncementType, typeof Megaphone> = {
  promocao: Megaphone,
  cupom:    Tag,
  aviso:    Info,
};

const TYPE_BADGE_VARIANT: Record<AnnouncementType, "gold" | "info" | "neutral"> = {
  promocao: "gold",
  cupom:    "info",
  aviso:    "neutral",
};

interface FormState {
  type: AnnouncementType;
  title: string;
  message: string;
  coupon_code: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { type: "aviso", title: "", message: "", coupon_code: "", is_active: true };

function announcementToForm(a: Announcement): FormState {
  return { type: a.type, title: a.title, message: a.message, coupon_code: a.coupon_code ?? "", is_active: a.is_active };
}

function AnnouncementFormModal({
  isOpen,
  onClose,
  editing,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: Announcement | null;
  onSave: (input: AnnouncementFormData) => Promise<{ error?: string }>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(editing ? announcementToForm(editing) : EMPTY_FORM);
      setError("");
    }
  }, [isOpen, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSave(form);
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Editar aviso" : "Novo aviso"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="accent" onClick={handleSubmit} isLoading={saving}>Salvar</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}

        <Select
          label="Tipo"
          value={form.type}
          onChange={(v) => set("type", v as AnnouncementType)}
          options={TYPE_OPTIONS}
        />
        <Input
          label="Título"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex: Frete grátis essa semana!"
        />
        {form.type === "cupom" && (
          <Input
            label="Código do cupom"
            value={form.coupon_code}
            onChange={(e) => set("coupon_code", e.target.value.toUpperCase())}
            placeholder="Ex: BEMVINDO10"
            className="font-mono tracking-widest"
            helper="Aparece destacado no sino do site, com botão de copiar."
            required
          />
        )}
        <div>
          <label className="block text-xs font-medium text-dark-text mb-1.5">Mensagem</label>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            rows={3}
            placeholder="Ex: Use o cupom BEMVINDO10 e ganhe 10% de desconto na primeira compra."
            className="w-full bg-dark-alt border border-dark-border-light rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder:text-muted focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 resize-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} />
          <span className="text-sm text-dark-text">Ativo</span>
        </div>
      </form>
    </Modal>
  );
}

export function AnunciosClient({ initialAnnouncements }: Props) {
  const [announcements, setOptimisticAnnouncements] = useOptimistic(initialAnnouncements);
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setFormOpen(true); };

  const handleSave = async (input: AnnouncementFormData): Promise<{ error?: string }> => {
    if (editing) {
      const res = await updateAnnouncement(editing.id, input);
      if (!("error" in res)) {
        startTransition(() => {
          setOptimisticAnnouncements((prev) =>
            prev.map((a) => (a.id === editing.id ? { ...a, ...input } : a))
          );
        });
        return {};
      }
      return res;
    }
    const res = await createAnnouncement(input);
    return "error" in res ? res : {};
  };

  const handleToggle = (a: Announcement) => {
    const next = !a.is_active;
    startTransition(async () => {
      setOptimisticAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, is_active: next } : x))
      );
      const res = await toggleAnnouncementActive(a.id, next);
      if ("error" in res) setActionError(res.error);
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      setOptimisticAnnouncements((prev) => prev.filter((a) => a.id !== id));
      const res = await deleteAnnouncement(id);
      if ("error" in res) setActionError(res.error);
    });
    setDeleteConfirm(null);
  };

  const activeCount = announcements.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Avisos</h1>
          <p className="text-sm text-muted mt-1">
            {announcements.length} aviso{announcements.length !== 1 ? "s" : ""} · {activeCount} ativo{activeCount !== 1 ? "s" : ""} · aparecem no sino do site
          </p>
        </div>
        <Button variant="accent" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Novo aviso
        </Button>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
          <AlertCircle size={15} className="flex-shrink-0" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-danger/60 hover:text-danger text-xs underline">
            Fechar
          </button>
        </div>
      )}

      <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
        {announcements.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted text-sm">Nenhum aviso cadastrado.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-accent hover:underline">
              Criar o primeiro aviso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-alt">
                  {["Tipo", "Título / Mensagem", "Ativo", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => {
                  const Icon = TYPE_ICON[a.type];
                  return (
                    <tr key={a.id} className="border-b border-dark-border last:border-0 hover:bg-dark-hover transition-colors">
                      <td className="px-4 py-3">
                        <Badge
                          label={ANNOUNCEMENT_TYPE_LABELS[a.type]}
                          variant={TYPE_BADGE_VARIANT[a.type]}
                          size="sm"
                          dot={false}
                        />
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="flex items-start gap-2">
                          <Icon size={14} className="text-accent flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-dark-text">{a.title}</p>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.message}</p>
                            {a.coupon_code && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-success/10 border border-success/25 text-success text-[10px] font-mono font-bold tracking-wider">
                                {a.coupon_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle checked={a.is_active} onChange={() => handleToggle(a)} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="text-muted hover:text-accent transition-colors"
                            title="Editar aviso"
                          >
                            <Edit2 size={14} />
                          </button>
                          {deleteConfirm === a.id ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleDelete(a.id)} className="text-xs text-danger font-semibold hover:underline">
                                Confirmar
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted hover:text-dark-text">
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(a.id)}
                              className="text-muted hover:text-danger transition-colors"
                              title="Excluir aviso"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnnouncementFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}
