import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { ProductPdpClient } from "@/components/public/ProductPdpClient";
import { ProductCard } from "@/components/public/ProductCard";
import { Container } from "@/components/common/SectionHeader";
import { getProductBySlug as dbGetProductBySlug, getRelatedProducts as dbGetRelatedProducts } from "@/lib/db/products";
import { getProductBySlug as mockGetProductBySlug, getRelatedProducts as mockGetRelatedProducts } from "@/data/mock-products";
import { getPublicStoreSettings } from "@/lib/db/settings";
import { routes } from "@/lib/routes";
import type { Product } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await dbGetProductBySlug(slug);
    return { title: p?.name ?? "Produto" };
  } catch {
    const p = mockGetProductBySlug(slug);
    return { title: p?.name ?? "Produto" };
  }
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params;

  // Busca produto com fallback para mock
  let product: Product | null = null;
  try {
    product = await dbGetProductBySlug(slug);
  } catch {
    product = mockGetProductBySlug(slug) ?? null;
  }

  if (!product) notFound();

  const settings = await getPublicStoreSettings();

  // "Tamanhos disponíveis" some daqui — os tamanhos já aparecem como botões
  // reais na área de compra (seletor de tamanho), então repetir como texto
  // em Especificações é redundante. No lugar (mesma posição), mostra o SKU
  // de forma discreta como "Código do produto" — nunca aparece se o
  // produto não tiver SKU.
  const rawSpecs = product.specifications ?? [];
  const sizesIndex = rawSpecs.findIndex((spec) => spec.label === "Tamanhos disponíveis");
  const displaySpecs = rawSpecs.filter((spec) => spec.label !== "Tamanhos disponíveis");
  if (product.sku?.trim()) {
    const codeSpec = { label: "Código do produto", value: product.sku };
    const insertAt = sizesIndex === -1 ? displaySpecs.length : sizesIndex;
    displaySpecs.splice(insertAt, 0, codeSpec);
  }

  // Busca relacionados com fallback para mock (independente da busca de produto)
  let related: Product[] = [];
  try {
    related = await dbGetRelatedProducts(product.id, product.category_id);
  } catch {
    related = mockGetRelatedProducts(product.id, product.category_id);
  }

  return (
    <div className="py-16">
      <Container>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted mb-10 flex-wrap">
          <Link href={routes.home} className="hover:text-accent transition-colors">Início</Link>
          {product.category && (
            <>
              <ChevronRight size={12} className="text-muted/50" />
              <Link
                href={routes.categoria(product.category.slug)}
                className="hover:text-accent transition-colors"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={12} className="text-muted/50" />
          <span className="text-dark-text/80 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Galeria + seletor de cor/tamanho + compra — tudo client-side pra
            trocar de cor sem reload (ver ProductPdpClient) */}
        <ProductPdpClient product={product} whatsappNumber={settings.whatsapp_number} />

        {/* Description + Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">
          <div className="relative bg-dark-surface rounded-2xl border border-dark-border p-7 overflow-hidden">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            <h2 className="text-base font-bold text-dark-text mb-5 tracking-wide">Descrição completa</h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {displaySpecs.length > 0 && (
            <div className="relative bg-dark-surface rounded-2xl border border-dark-border p-7 overflow-hidden">
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
              <h2 className="text-base font-bold text-dark-text mb-5 tracking-wide">Especificações</h2>
              <table className="w-full text-sm">
                <tbody>
                  {displaySpecs.map((spec, i) => (
                    <tr key={i} className="border-b border-dark-border/60 last:border-0">
                      <td className="py-3 pr-4 text-muted/80 font-medium w-1/3 text-xs uppercase tracking-wide">{spec.label}</td>
                      <td className="py-3 text-dark-text text-sm">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {product.warnings && (
                <div className="flex items-start gap-3 mt-6 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                  <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning/90 leading-relaxed whitespace-pre-line">
                    {product.warnings}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Produtos relacionados */}
        {related.length > 0 && (
          <div>
            <div className="divider-gold mb-10" />
            <h2 className="text-2xl font-bold text-dark-text mb-8 tracking-tight">Produtos relacionados</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </Container>
    </div>
  );
}
