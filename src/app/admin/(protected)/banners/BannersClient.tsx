"use client";

import React, { useRef, useState, useTransition } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, X, CheckCircle2,
  AlertCircle, Monitor, Smartphone, RefreshCw, Info,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Toggle } from "@/components/common/Toggle";
import {
  createBanner, updateBanner, deleteBanner, toggleBannerActive,
} from "@/lib/actions/banners";
import type { HomeBanner } from "@/types";

interface SelectOption {
  value: string;
  label: string;
}
import { MobilePreviewPanel } from "@/components/admin/MobilePreviewPanel";
import { BannerSlide } from "@/components/shared/BannerSlide";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface FormState {
  title: string;
  subtitle: string;
  link_type: "product" | "category" | "url";
  link_product_id: string;
  link_category_id: string;
  link_url: string;
  link_label: string;
  is_active: boolean;
  display_order: number;
  // Desktop
  image_url: string;
  storage_path: string;
  desktop_object_position_x: number;
  desktop_object_position_y: number;
  desktop_scale: number;
  // Mobile
  image_mobile_url: string;
  mobile_storage_path: string;
  mobile_object_position_x: number;
  mobile_object_position_y: number;
  mobile_scale: number;
}

const EMPTY_FORM: FormState = {
  title: "", subtitle: "",
  link_type: "url", link_product_id: "", link_category_id: "",
  link_url: "", link_label: "Ver produtos",
  is_active: true, display_order: 0,
  image_url: "", storage_path: "",
  desktop_object_position_x: 50, desktop_object_position_y: 50, desktop_scale: 1,
  image_mobile_url: "", mobile_storage_path: "",
  mobile_object_position_x: 50, mobile_object_position_y: 50, mobile_scale: 1,
};

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

// Slider de ajuste com botões −/+
function SliderControl({
  label, value, min, max, step, unit, onRaw,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onRaw: (v: number) => void;
}) {
  const dec = () => onRaw(Math.max(min, parseFloat((value - step).toFixed(2))));
  const inc = () => onRaw(Math.min(max, parseFloat((value + step).toFixed(2))));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-mono text-accent">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={dec}
          className="w-6 h-6 rounded border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center text-base leading-none transition-all"
        >−</button>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onRaw(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-yellow-400 cursor-pointer"
        />
        <button
          onClick={inc}
          className="w-6 h-6 rounded border border-dark-border text-muted hover:text-dark-text hover:border-accent/40 flex items-center justify-center text-base leading-none transition-all"
        >+</button>
      </div>
    </div>
  );
}

// Área de upload de imagem — clique OU arrastar-e-soltar um arquivo do
// computador (mesmo padrão de drag-and-drop usado em VariantEditor/
// ProductColorCurator no Admin).
function UploadArea({
  label, hint, imageUrl, uploading, onFile, onClear,
}: {
  label: string;
  hint: string;
  imageUrl: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-dark-text">{label}</p>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      {imageUrl ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-dark-border group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-danger/80 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
            title="Remover imagem"
          ><X size={14} /></button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          onDragEnter={(e) => { e.preventDefault(); dragCounter.current += 1; setDragging(true); }}
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
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={[
            "w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-muted disabled:opacity-50",
            dragging ? "border-accent bg-accent/10" : "border-dark-border hover:border-accent/50 hover:bg-accent/5",
          ].join(" ")}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : (
            <>
              <Upload size={22} />
              <span className="text-xs text-center px-4">Arraste ou clique para fazer upload<br />JPEG · PNG · WEBP · máx. 10 MB</span>
            </>
          )}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
    </div>
  );
}

// Preview em tempo real — usa o mesmo BannerSlide da Home
function BannerPreview({ form, mode }: { form: FormState; mode: "desktop" | "mobile" }) {
  const isDesktop = mode === "desktop";
  const containerClass = isDesktop ? "w-full" : "w-48 mx-auto";

  // Mesmas proporções usadas na Home: 1800×600 desktop, 1280×720 mobile —
  // banner contido e curto, não ocupa a tela inteira (nem no PC nem no celular).
  const aspectStyle = isDesktop
    ? { aspectRatio: "1800 / 600" }
    : { aspectRatio: "1280 / 720" };

  return (
    <div className={containerClass}>
      <div className="relative overflow-hidden rounded-xl" style={aspectStyle}>
        {form.image_url ? (
          <BannerSlide
            imageUrl={form.image_url}
            mobileImageUrl={form.image_mobile_url || null}
            desktopPosX={form.desktop_object_position_x}
            desktopPosY={form.desktop_object_position_y}
            desktopScale={form.desktop_scale}
            mobilePosX={form.mobile_object_position_x}
            mobilePosY={form.mobile_object_position_y}
            mobileScale={form.mobile_scale}
            title={form.title || null}
            subtitle={form.subtitle || null}
            linkUrl={form.link_url || null}
            mode={mode}
          />
        ) : (
          <div className="absolute inset-0 bg-dark-alt border border-dark-border flex flex-col items-center justify-center gap-1 text-muted">
            {isDesktop ? <Monitor size={22} /> : <Smartphone size={22} />}
            <span className="text-xs">Faça upload para ver o preview</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted text-center mt-1.5">
        {isDesktop ? "Desktop · 1800×600px recomendado" : "Mobile · 1280×720px recomendado"}
      </p>
    </div>
  );
}

// Editor de enquadramento para um modo (desktop ou mobile)
function FramingEditor({
  form, mode, setForm,
}: {
  form: FormState;
  mode: "desktop" | "mobile";
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const isDesktop = mode === "desktop";

  const set = (key: keyof FormState, val: number) =>
    setForm((f) => ({ ...f, [key]: val }));

  const reset = () => {
    if (isDesktop) {
      setForm((f) => ({ ...f, desktop_object_position_x: 50, desktop_object_position_y: 50, desktop_scale: 1 }));
    } else {
      setForm((f) => ({ ...f, mobile_object_position_x: 50, mobile_object_position_y: 50, mobile_scale: 1 }));
    }
  };

  const posX   = isDesktop ? form.desktop_object_position_x : form.mobile_object_position_x;
  const posY   = isDesktop ? form.desktop_object_position_y : form.mobile_object_position_y;
  const scale  = isDesktop ? form.desktop_scale             : form.mobile_scale;
  const keyX   = isDesktop ? "desktop_object_position_x"   : "mobile_object_position_x";
  const keyY   = isDesktop ? "desktop_object_position_y"   : "mobile_object_position_y";
  const keyS   = isDesktop ? "desktop_scale"                : "mobile_scale";

  return (
    <div className="space-y-3 p-3 bg-dark-alt rounded-xl border border-dark-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dark-text">Enquadramento</span>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
          title="Centralizar e resetar zoom"
        >
          <RefreshCw size={12} />
          Centralizar
        </button>
      </div>

      <SliderControl
        label="Posição horizontal (Esq ← → Dir)"
        value={posX} min={0} max={100} step={5} unit="%"
        onRaw={(v) => set(keyX as keyof FormState, v)}
      />
      <SliderControl
        label="Posição vertical (Topo ↑ ↓ Base)"
        value={posY} min={0} max={100} step={5} unit="%"
        onRaw={(v) => set(keyY as keyof FormState, v)}
      />
      <SliderControl
        label="Zoom"
        value={scale} min={1} max={3} step={0.1} unit="×"
        onRaw={(v) => set(keyS as keyof FormState, v)}
      />
      {scale <= 1 && (
        <p className="text-xs text-muted/60 italic">
          Aumente o zoom para ver o ponto focal da posição em ação.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export interface BannersClientProps {
  initialBanners: HomeBanner[];
  categoryOptions: SelectOption[];
  productOptions: SelectOption[];
}

export const BannersClient = ({ initialBanners, categoryOptions, productOptions }: BannersClientProps) => {
  const [banners, setBanners]       = useState<HomeBanner[]>(initialBanners);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>({ ...EMPTY_FORM });
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const [uploadingD, setUploadingD] = useState(false);
  const [uploadingM, setUploadingM] = useState(false);
  const [toast, setToast]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(0);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // -------------------------------------------------------------------------
  // Upload handlers
  // -------------------------------------------------------------------------

  const handleUpload = async (
    file: File,
    mode: "desktop" | "mobile"
  ) => {
    const setLoading = mode === "desktop" ? setUploadingD : setUploadingM;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload-banner", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; storagePath?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro no upload");

      if (mode === "desktop") {
        setForm((f) => ({ ...f, image_url: json.url!, storage_path: json.storagePath! }));
      } else {
        setForm((f) => ({ ...f, image_mobile_url: json.url!, mobile_storage_path: json.storagePath! }));
      }
    } catch (err) {
      showToast("err", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const makeFileHandler = (mode: "desktop" | "mobile") =>
    (file: File) => handleUpload(file, mode);

  // Sem isso, soltar o arquivo um pixel fora da área exata do upload faz o
  // navegador abrir a imagem direto (navegando pra fora da página) em vez de
  // só ignorar o drop — mesmo cuidado já tomado no VariantEditor.
  React.useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Abrir edição
  // -------------------------------------------------------------------------

  const openEdit = (b: HomeBanner) => {
    setEditingId(b.id);
    // Se o produto/categoria vinculado foi excluído (FK seta para NULL), o
    // link_type fica "órfão" — volta para "url" em vez de travar o salvamento
    // exigindo uma seleção que não existe mais.
    const orphanedProduct  = b.link_type === "product"  && !b.link_product_id;
    const orphanedCategory = b.link_type === "category" && !b.link_category_id;
    const safeLinkType = orphanedProduct || orphanedCategory ? "url" : (b.link_type ?? "url");
    setForm({
      title:         b.title         ?? "",
      subtitle:      b.subtitle      ?? "",
      link_type:        safeLinkType,
      link_product_id:  b.link_product_id  ?? "",
      link_category_id: b.link_category_id ?? "",
      link_url:      b.link_url      ?? "",
      link_label:    b.link_label,
      is_active:     b.is_active,
      display_order: b.display_order,
      image_url:     b.image_url,
      storage_path:  b.storage_path  ?? "",
      desktop_object_position_x: b.desktop_object_position_x ?? 50,
      desktop_object_position_y: b.desktop_object_position_y ?? 50,
      desktop_scale:             b.desktop_scale             ?? 1,
      image_mobile_url:    b.image_mobile_url    ?? "",
      mobile_storage_path: b.mobile_storage_path ?? "",
      mobile_object_position_x: b.mobile_object_position_x ?? 50,
      mobile_object_position_y: b.mobile_object_position_y ?? 50,
      mobile_scale:             b.mobile_scale             ?? 1,
    });
    setPreviewTab("desktop");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
    setPreviewTab("desktop");
  };

  // -------------------------------------------------------------------------
  // Salvar
  // -------------------------------------------------------------------------

  const handleSave = () => {
    if (!form.image_url) {
      showToast("err", "Faça upload da imagem Desktop antes de salvar.");
      return;
    }
    if (form.link_type === "product" && !form.link_product_id) {
      showToast("err", "Selecione o produto de destino.");
      return;
    }
    if (form.link_type === "category" && !form.link_category_id) {
      showToast("err", "Selecione a categoria de destino.");
      return;
    }

    startTransition(async () => {
      const payload = {
        title:               form.title,
        subtitle:            form.subtitle,
        image_url:           form.image_url,
        storage_path:        form.storage_path,
        image_mobile_url:    form.image_mobile_url,
        mobile_storage_path: form.mobile_storage_path,
        link_type:           form.link_type,
        link_product_id:     form.link_type === "product" ? form.link_product_id : null,
        link_category_id:    form.link_type === "category" ? form.link_category_id : null,
        link_url:            form.link_type === "url" ? form.link_url : "",
        is_active:           form.is_active,
        display_order:       Number(form.display_order),
        desktop_object_position_x: form.desktop_object_position_x,
        desktop_object_position_y: form.desktop_object_position_y,
        desktop_scale:             form.desktop_scale,
        mobile_object_position_x:  form.mobile_object_position_x,
        mobile_object_position_y:  form.mobile_object_position_y,
        mobile_scale:              form.mobile_scale,
      };

      if (editingId) {
        const res = await updateBanner(editingId, payload);
        if ("error" in res) { showToast("err", res.error); return; }
        setBanners((prev) =>
          prev.map((b) => b.id === editingId
            ? {
                ...b,
                ...payload,
                title:               payload.title    || null,
                subtitle:            payload.subtitle || null,
                link_url:            res.link_url ?? null,
                storage_path:        payload.storage_path    || null,
                image_mobile_url:    payload.image_mobile_url    || null,
                mobile_storage_path: payload.mobile_storage_path || null,
                updated_at:          new Date().toISOString(),
              }
            : b
          )
        );
        showToast("ok", "Banner atualizado!");
        setLastSavedAt(Date.now());
      } else {
        const res = await createBanner(payload);
        if ("error" in res) { showToast("err", res.error); return; }
        const newBanner: HomeBanner = {
          id: res.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          link_label: "Ver produtos",
          ...payload,
          title:               payload.title    || null,
          subtitle:            payload.subtitle || null,
          link_url:            res.link_url,
          storage_path:        payload.storage_path    || null,
          image_mobile_url:    payload.image_mobile_url    || null,
          mobile_storage_path: payload.mobile_storage_path || null,
        };
        setBanners((prev) => [...prev, newBanner].sort((a, b) => a.display_order - b.display_order));
        showToast("ok", "Banner criado!");
        setLastSavedAt(Date.now());
      }
      resetForm();
    });
  };

  // -------------------------------------------------------------------------
  // Toggle / Delete
  // -------------------------------------------------------------------------

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      const res = await toggleBannerActive(id, !current);
      if ("error" in res) { showToast("err", res.error); return; }
      setBanners((prev) => prev.map((b) => b.id === id ? { ...b, is_active: !current } : b));
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este banner? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const res = await deleteBanner(id);
      if ("error" in res) { showToast("err", res.error); return; }
      setBanners((prev) => prev.filter((b) => b.id !== id));
      if (editingId === id) resetForm();
      showToast("ok", "Banner excluído.");
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={[
          "fixed top-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium",
          toast.type === "ok"
            ? "bg-success/10 border-success/30 text-success"
            : "bg-danger/10 border-danger/30 text-danger",
        ].join(" ")}>
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-text">Banners da Home</h1>
          <p className="text-sm text-muted mt-0.5">
            {banners.length === 0
              ? "Nenhum banner cadastrado — a home exibirá o hero padrão."
              : `${banners.length} banner${banners.length > 1 ? "s" : ""} cadastrado${banners.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-dark-text bg-dark-alt hover:bg-dark-hover border border-dark-border transition-all"
          >
            <Smartphone size={14} />
            Preview mobile
          </button>
          {!showForm && (
            <Button variant="accent" size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowForm(true)}>
              Novo banner
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FORMULÁRIO                                                           */}
      {/* ------------------------------------------------------------------ */}
      {showForm && (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 space-y-6">

          {/* Título do form */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-dark-text">
              {editingId ? "Editar banner" : "Novo banner"}
            </h2>
            <button onClick={resetForm} className="text-muted hover:text-dark-text transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* -- Uploads (lado a lado em desktop, empilhados em mobile) -- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UploadArea
              label="Imagem Desktop (obrigatória)"
              hint="1800×600px recomendado"
              imageUrl={form.image_url}
              uploading={uploadingD}
              onFile={makeFileHandler("desktop")}
              onClear={() => setForm((f) => ({ ...f, image_url: "", storage_path: "" }))}
            />
            <UploadArea
              label="Imagem Mobile (opcional)"
              hint="1280×720px recomendado"
              imageUrl={form.image_mobile_url}
              uploading={uploadingM}
              onFile={makeFileHandler("mobile")}
              onClear={() => setForm((f) => ({ ...f, image_mobile_url: "", mobile_storage_path: "" }))}
            />
          </div>

          {/* Info sobre mobile fallback */}
          {!form.image_mobile_url && (
            <div className="flex items-start gap-2 text-xs text-muted bg-dark-alt rounded-lg p-2.5">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <span>Sem imagem mobile: a imagem desktop será usada em celulares com o enquadramento mobile aplicado.</span>
            </div>
          )}

          {/* -- Preview + Editor de enquadramento -- */}
          <div className="space-y-3">
            {/* Tabs de preview */}
            <div className="flex gap-1 bg-dark-alt rounded-lg p-1 w-fit">
              {(["desktop", "mobile"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPreviewTab(tab)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    previewTab === tab
                      ? "bg-dark-surface text-dark-text shadow-sm"
                      : "text-muted hover:text-dark-text",
                  ].join(" ")}
                >
                  {tab === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
                  {tab === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>

            {/* Mensagem de fidelidade */}
            <div className="flex items-start gap-2 text-xs bg-dark-alt/60 border border-dark-border/50 rounded-lg p-2.5 text-muted">
              <Info size={13} className="flex-shrink-0 mt-0.5 text-accent/70" />
              <span>
                Este preview usa o mesmo componente da Home. O resultado será idêntico ao site publicado.
              </span>
            </div>

            {/* Preview em tempo real */}
            <BannerPreview form={form} mode={previewTab} />

            {/* Controles de enquadramento para o modo ativo */}
            <FramingEditor form={form} mode={previewTab} setForm={setForm} />
          </div>

          {/* -- Campos de conteúdo -- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Título (opcional)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Promoção de inverno"
            />
            <Input
              label="Subtítulo (opcional)"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Ex: Até 30% off em camisetas"
            />
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-medium text-dark-text">Tipo de destino</p>
              <div className="flex gap-2">
                {([
                  { value: "product",  label: "Produto" },
                  { value: "category", label: "Categoria" },
                  { value: "url",      label: "URL externa" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, link_type: opt.value }))}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      form.link_type === opt.value
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "border-dark-border text-muted hover:border-accent/30",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {form.link_type === "product" && (
                <Select
                  label="Selecionar produto"
                  value={form.link_product_id}
                  onChange={(v) => setForm((f) => ({ ...f, link_product_id: v }))}
                  options={productOptions}
                />
              )}
              {form.link_type === "category" && (
                <Select
                  label="Selecionar categoria"
                  value={form.link_category_id}
                  onChange={(v) => setForm((f) => ({ ...f, link_category_id: v }))}
                  options={categoryOptions}
                />
              )}
              {form.link_type === "url" && (
                <Input
                  label="URL do link"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  placeholder="/categoria/masculino ou https://..."
                />
              )}
              <p className="text-xs text-muted flex items-center gap-1.5 pt-0.5">
                <Info size={12} className="flex-shrink-0" />
                {form.link_type === "url"
                  ? "Se preencher a URL, o banner inteiro será clicável."
                  : "A URL é gerada automaticamente a partir do item selecionado."}
              </p>
            </div>
            <Input
              label="Ordem de exibição"
              type="number"
              value={String(form.display_order)}
              onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
            />
            <div className="flex items-center gap-3 pt-6">
              <Toggle
                checked={form.is_active}
                onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <span className="text-sm text-dark-text">Ativo na home</span>
            </div>
          </div>

          {/* -- Botões de ação -- */}
          <div className="flex gap-3 pt-1 border-t border-dark-border">
            <Button
              variant="accent"
              onClick={handleSave}
              isLoading={isPending}
              disabled={!form.image_url || uploadingD || uploadingM}
            >
              {editingId ? "Salvar alterações" : "Criar banner"}
            </Button>
            <Button variant="secondary" onClick={resetForm} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* LISTA DE BANNERS                                                     */}
      {/* ------------------------------------------------------------------ */}
      {banners.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-12 text-center">
          <Monitor size={32} className="text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted text-sm">Nenhum banner cadastrado.</p>
          <p className="text-muted text-xs mt-1">
            A home exibirá o hero padrão enquanto não houver banners ativos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className="bg-dark-surface border border-dark-border rounded-2xl p-4 flex gap-4 items-center"
            >
              {/* Thumbnail desktop */}
              <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-dark-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url}
                  alt={b.title ?? "Banner"}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${b.desktop_object_position_x ?? 50}% ${b.desktop_object_position_y ?? 50}%`,
                  }}
                />
                {/* Badge mobile */}
                {b.image_mobile_url && (
                  <div className="absolute bottom-1 right-1 bg-black/70 rounded px-1 py-0.5">
                    <Smartphone size={9} className="text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dark-text truncate">
                    {b.title || <span className="italic text-muted">Sem título</span>}
                  </p>
                  <span className={[
                    "flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium",
                    b.is_active
                      ? "bg-success/10 text-success"
                      : "bg-dark-border text-muted",
                  ].join(" ")}>
                    {b.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {b.subtitle && (
                  <p className="text-xs text-muted truncate">{b.subtitle}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span>Ordem: {b.display_order}</span>
                  {b.image_mobile_url && <span className="text-accent">+ imagem mobile</span>}
                  {b.link_url && <span className="truncate max-w-[160px]">→ {b.link_url}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(b.id, b.is_active)}
                  disabled={isPending}
                  title={b.is_active ? "Desativar" : "Ativar"}
                  className={[
                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                    b.is_active
                      ? "border-success/30 text-success hover:bg-success/10"
                      : "border-dark-border text-muted hover:border-accent/30 hover:text-accent",
                  ].join(" ")}
                >
                  {b.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>

                <Button variant="ghost" size="sm" onClick={() => openEdit(b)} disabled={isPending}>
                  Editar
                </Button>

                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={isPending}
                  title="Excluir banner"
                  className="w-8 h-8 rounded-lg border border-dark-border text-muted hover:border-danger/30 hover:text-danger flex items-center justify-center transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MobilePreviewPanel
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        savedAt={lastSavedAt}
      />
    </div>
  );
};
