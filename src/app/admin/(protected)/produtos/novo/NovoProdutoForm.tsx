"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Toggle } from "@/components/common/Toggle";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { ProductPreviewCard } from "@/components/admin/ProductPreviewCard";
import { PriceTierEditor } from "@/components/admin/PriceTierEditor";
import { ProductBadgeEditor } from "@/components/admin/ProductBadgeEditor";
import { createProduct, copyProductImagesForDraft } from "@/lib/actions/products";
import { saveMediaChanges } from "@/lib/actions/media";
import { routes } from "@/lib/routes";
import { slugify } from "@/lib/formatters";
import type { ProductFormData, ProductDuplicationData } from "@/lib/actions/products";
import type { UploadedMedia } from "@/components/admin/MediaUploader";
import type { ProductBadgeValue } from "@/components/admin/ProductBadgeEditor";
import type { PriceTier, ProductMedia, Product, ProductFulfillmentType } from "@/types";
import { FULFILLMENT_TYPE_LABELS } from "@/types";

// Logística — sem UI própria, a loja não pede esses dados no formulário.
const DEFAULT_WEIGHT_KG = 0.1;
const DEFAULT_DIMENSION_CM = 10;
const DEFAULT_HANDLING_DAYS = 0;

interface CategoryOption {
  value: string;
  label: string;
}

interface Props {
  categoryOptions: CategoryOption[];
  /**
   * Dados do produto de origem quando este formulário foi aberto a partir de
   * "Duplicar produto". Apenas pré-preenche os campos — NADA é gravado no
   * banco até o admin clicar em Rascunho/Publicar, como qualquer criação.
   */
  duplicateFrom?: ProductDuplicationData | null;
  duplicateFromId?: string;
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-dark-text">{title}</h2>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function HelpText({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-1">
      <Info size={12} className="text-muted flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted">{text}</p>
    </div>
  );
}

export function NovoProdutoForm({ categoryOptions, duplicateFrom, duplicateFromId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isDuplicating = !!duplicateFrom;

  // UUID gerado no cliente para que o upload possa acontecer antes do produto existir no banco
  const [productId] = useState(() => crypto.randomUUID());
  const [mediaItems, setMediaItems] = useState<UploadedMedia[]>([]);
  const [removedDbIds, setRemovedDbIds] = useState<string[]>([]);

  // Imagens copiadas no Storage a partir do produto de origem (duplicar) —
  // só existem como arquivos soltos até o admin salvar; nenhuma linha em
  // product_media é criada aqui.
  const [prefilledImages, setPrefilledImages] = useState<
    { url: string; storagePath: string; altText?: string }[]
  >([]);
  const [copyingImages, setCopyingImages] = useState(isDuplicating);

  useEffect(() => {
    if (!duplicateFromId) return;
    let cancelled = false;
    setCopyingImages(true);
    copyProductImagesForDraft(duplicateFromId, productId).then((result) => {
      if (cancelled) return;
      if (result.images) setPrefilledImages(result.images);
      setCopyingImages(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateFromId]);

  const handleMediaChange = (items: UploadedMedia[], removed: string[]) => {
    setMediaItems(items);
    setRemovedDbIds(removed);
  };

  const dupName = duplicateFrom ? `${duplicateFrom.name} (Cópia)` : "";

  const [name, setName] = useState(dupName);
  const [slug, setSlug] = useState(dupName ? slugify(dupName) : "");
  const [categoryId, setCategoryId] = useState(duplicateFrom?.category_id ?? "");
  const [isActive, setIsActive] = useState(!isDuplicating);
  const [shortDesc, setShortDesc] = useState(duplicateFrom?.short_description ?? "");
  const [pricePix, setPricePix] = useState(duplicateFrom ? String(duplicateFrom.price_pix) : "");
  const [priceCard, setPriceCard] = useState(duplicateFrom ? String(duplicateFrom.price_card) : "");
  const [pricePromo, setPricePromo] = useState(
    duplicateFrom?.price_promotional != null ? String(duplicateFrom.price_promotional) : ""
  );
  const [promotionalActive, setPromotionalActive] = useState(duplicateFrom?.promotional_active ?? false);
  const [quantityPricingEnabled, setQuantityPricingEnabled] = useState(
    duplicateFrom?.quantity_pricing_enabled ?? false
  );
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>(duplicateFrom?.price_tiers ?? []);
  const [allowWhatsapp, setAllowWhatsapp] = useState(duplicateFrom?.allow_whatsapp ?? true);
  const [showIllustrativeBadge, setShowIllustrativeBadge] = useState(
    duplicateFrom?.show_illustrative_badge ?? true
  );
  const [fulfillmentType, setFulfillmentType] = useState<ProductFulfillmentType | null>(
    duplicateFrom?.fulfillment_type ?? null
  );

  // Selo nunca é copiado ao duplicar — começa sempre vazio, propositalmente
  // (mesma lógica do slug: cada produto novo escolhe o seu).
  const [badge, setBadge] = useState<ProductBadgeValue | null>(null);

  const selectedCat = categoryOptions.find((c) => c.value === categoryId);

  const previewMedia = mediaItems
    .filter((m) => !m.uploading && !m.uploadError)
    .map((m) => ({ url: m.url, type: m.type }));

  // Produto "ao vivo" a partir do estado atual, SEM badge — usado apenas
  // como contexto visual no ProductBadgeEditor (o selo é desenhado por
  // cima, arrastável, separadamente).
  const badgePreviewMedia: ProductMedia[] = mediaItems
    .filter((m) => !m.uploading && !m.uploadError)
    .map((m, i) => ({
      id:            m.dbId ?? m.localId,
      product_id:    productId,
      type:          m.type,
      url:           m.url,
      alt_text:      m.alt_text,
      display_order: i,
      is_main:       i === 0,
      created_at:    new Date().toISOString(),
    }));

  const badgePreviewProduct: Product = {
    id:                  productId,
    name:                name || "Nome do produto",
    slug:                slug || "produto",
    sku:                 "",
    category_id:         categoryId,
    display_order:       0,
    price_pix:           parseFloat(pricePix)  || 0,
    price_card:          parseFloat(priceCard) || 0,
    price_promotional:   parseFloat(pricePromo) || undefined,
    promotional_active:  promotionalActive,
    is_active:           true, // só preview visual no editor — não é salvo
    is_featured:         false,
    short_description:   shortDesc,
    description:         "",
    media:               badgePreviewMedia,
    stock:               null,
    stock_minimum:       2,
    availability:        "in_stock",
    track_stock:         false,
    quantity_pricing_enabled: quantityPricingEnabled,
    price_tiers:         priceTiers,
    weight_kg:           DEFAULT_WEIGHT_KG,
    height_cm:           DEFAULT_DIMENSION_CM,
    width_cm:            DEFAULT_DIMENSION_CM,
    length_cm:           DEFAULT_DIMENSION_CM,
    extra_handling_days: DEFAULT_HANDLING_DAYS,
    allow_whatsapp:      allowWhatsapp,
    show_illustrative_badge: showIllustrativeBadge,
    fulfillment_type:    fulfillmentType,
    created_at:          new Date().toISOString(),
    updated_at:          new Date().toISOString(),
  };

  const buildPayload = (
    publish: boolean
  ): ProductFormData => ({
    name,
    slug,
    sku:                 slug.toUpperCase(),
    category_id:         categoryId,
    price_pix:           parseFloat(pricePix)  || 0,
    price_card:          parseFloat(priceCard) || 0,
    price_promotional:   parseFloat(pricePromo) || null,
    promotional_active:  promotionalActive,
    is_active:           publish ? true : false,
    is_featured:         false,
    short_description:   shortDesc,
    description:         "",
    stock:               null,
    stock_minimum:       2,
    track_stock:         false,
    quantity_pricing_enabled: quantityPricingEnabled,
    price_tiers:         priceTiers,
    weight_kg:           DEFAULT_WEIGHT_KG,
    height_cm:           DEFAULT_DIMENSION_CM,
    width_cm:            DEFAULT_DIMENSION_CM,
    length_cm:           DEFAULT_DIMENSION_CM,
    extra_handling_days: DEFAULT_HANDLING_DAYS,
    allow_whatsapp:      allowWhatsapp,
    show_illustrative_badge: showIllustrativeBadge,
    fulfillment_type:    fulfillmentType,
    badge_image_url:     badge?.url         ?? null,
    badge_storage_path:  badge?.storagePath ?? null,
    badge_position_x:    badge?.posX,
    badge_position_y:    badge?.posY,
    badge_width_pct:     badge?.widthPct,
  });

  const handleSave = (publish: boolean) => {
    setError(null);

    const imageCount = mediaItems.filter((m) => m.type === "image" && !m.uploadError).length;
    if (imageCount < 1) {
      setError("Adicione pelo menos 1 imagem do produto.");
      return;
    }

    startTransition(async () => {
      const payload = buildPayload(publish);
      // Passa o productId pré-gerado para que as imagens já no storage usem o mesmo diretório
      const result = await createProduct({ ...payload, id: productId });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Salva as mídias coletadas pelo MediaUploader
      const mediaResult = await saveMediaChanges(productId, mediaItems, removedDbIds);
      if (mediaResult.error) {
        setError(mediaResult.error);
        return;
      }
      router.push(routes.admin.produtos);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={routes.admin.produtos}>
            <button className="w-8 h-8 rounded-lg bg-dark-alt border border-dark-border flex items-center justify-center hover:bg-dark-hover transition-colors">
              <ArrowLeft size={15} className="text-muted" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-dark-text">
              {isDuplicating ? "Duplicar produto" : "Criar produto"}
            </h1>
            <p className="text-xs text-muted">
              {isDuplicating
                ? "Campos pré-preenchidos a partir do produto original — nada foi salvo ainda. Defina um slug próprio e publique quando estiver pronto."
                : "Preencha os campos e publique"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Save size={14} />}
            onClick={() => handleSave(false)}
            isLoading={isPending}
            disabled={copyingImages}
          >
            Rascunho
          </Button>
          <Button
            variant="accent"
            size="sm"
            leftIcon={<Save size={14} />}
            onClick={() => handleSave(true)}
            isLoading={isPending}
            disabled={copyingImages}
          >
            Publicar
          </Button>
        </div>
      </div>

      {/* Botão Publicar flutuante — sempre acessível, mesmo rolado para baixo */}
      <button
        onClick={() => handleSave(true)}
        disabled={isPending || copyingImages}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full bg-accent text-dark-bg font-semibold text-sm shadow-2xl shadow-accent/30 hover:bg-accent-light hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Publicar
      </button>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
          {error}
        </div>
      )}

      {isDuplicating && (
        <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/30 rounded-xl text-sm text-warning">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Nada foi gravado no banco ainda. Este é só um rascunho em tela — ele só
            passa a existir como produto quando você clicar em &quot;Rascunho&quot; ou
            &quot;Publicar&quot;.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="xl:col-span-2 space-y-5">
          <SectionCard title="Informações básicas" hint="Nome e categoria do produto">
            <Input
              label="Nome do produto"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              placeholder="Ex: TNL (Retatrutida) 100mg"
            />
            <Select
              label="Categoria"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Selecione a categoria"
            />
          </SectionCard>

          <SectionCard title="Descrição" hint="Texto curto que aparece no card e na página do produto">
            <Input
              label="Descrição curta"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="Uma frase resumindo o produto"
            />
          </SectionCard>

          <SectionCard title="Preços">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Preço Pix (R$)"
                  type="number"
                  value={pricePix}
                  onChange={(e) => setPricePix(e.target.value)}
                  placeholder="0,00"
                />
                <HelpText text="Valor com desconto para Pix" />
              </div>
              <div>
                <Input
                  label="Preço Cartão (R$)"
                  type="number"
                  value={priceCard}
                  onChange={(e) => setPriceCard(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Input
                  label="Preço anterior (R$)"
                  type="number"
                  value={pricePromo}
                  onChange={(e) => setPricePromo(e.target.value)}
                  placeholder="0,00"
                />
                <HelpText text="Aparece riscado (promoção)" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-dark-text mb-1.5">Ativar promoção</p>
              <Toggle checked={promotionalActive} onChange={setPromotionalActive} />
            </div>
            <PriceTierEditor
              enabled={quantityPricingEnabled}
              onEnabledChange={setQuantityPricingEnabled}
              tiers={priceTiers}
              onTiersChange={setPriceTiers}
              basePrice={parseFloat(pricePix) || 0}
            />
          </SectionCard>

          <SectionCard title="Foto principal" hint="Foto de capa do produto">
            {copyingImages ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted text-sm">
                <Loader2 size={16} className="animate-spin" />
                Copiando imagens do produto original…
              </div>
            ) : (
              // key garante remontagem com prefilledImages já resolvido —
              // o estado inicial do MediaUploader só lê essa prop uma vez.
              <MediaUploader
                key={productId}
                productId={productId}
                prefilledImages={prefilledImages}
                onChange={handleMediaChange}
                maxImages={5}
              />
            )}
            <div className="pt-2 border-t border-dark-border">
              <p className="text-xs font-medium text-dark-text mb-1.5">Aviso &quot;Imagem meramente ilustrativa&quot;</p>
              <Toggle checked={showIllustrativeBadge} onChange={setShowIllustrativeBadge} />
              <HelpText text="Mostra o aviso sobre a foto do produto no card." />
            </div>
          </SectionCard>

          <SectionCard title="Selo de disponibilidade" hint="Selo exibido no card do produto — só um dos dois pode estar ativo por vez">
            <div className="flex gap-2 flex-wrap">
              {(["pronta_entrega", "sob_encomenda"] as ProductFulfillmentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFulfillmentType(fulfillmentType === type ? null : type)}
                  className={[
                    "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    fulfillmentType === type
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-dark-alt border-dark-border-light text-muted hover:text-dark-text",
                  ].join(" ")}
                >
                  {FULFILLMENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <HelpText text="Clique de novo no selo ativo para remover (nenhum selo)." />
          </SectionCard>

          <SectionCard title="Selo do produto" hint="Imagem opcional posicionada livremente sobre o card, exatamente como aparece no site">
            <ProductBadgeEditor
              productId={productId}
              value={badge}
              onChange={setBadge}
              previewProduct={badgePreviewProduct}
            />
          </SectionCard>

          <SectionCard title="Comportamento">
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-xs font-medium text-dark-text mb-1.5">Permitir WhatsApp</p>
                <Toggle checked={allowWhatsapp} onChange={setAllowWhatsapp} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Coluna de preview */}
        <div>
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Preview
            </p>
            <ProductPreviewCard
              name={name || undefined}
              short_description={shortDesc}
              price_pix={parseFloat(pricePix) || 0}
              price_card={parseFloat(priceCard) || 0}
              price_promotional={parseFloat(pricePromo) || undefined}
              promotional_active={promotionalActive}
              category_name={selectedCat?.label}
              media={previewMedia}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
