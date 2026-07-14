import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { ProductShowcase } from "@/components/public/ProductShowcase";
import { Container } from "@/components/common/SectionHeader";
import {
  getCategoryBySlug as dbGetCategoryBySlug,
  getChildCategories as dbGetChildCategories,
} from "@/lib/db/categories";
import { getProductsByCategoryIds as dbGetProductsByCategoryIds } from "@/lib/db/products";
import { getCategoryBySlug as mockGetCategoryBySlug } from "@/data/mock-categories";
import { getProductsByCategoryIds as mockGetProductsByCategoryIds } from "@/data/mock-products";
import { routes } from "@/lib/routes";
import type { Category, Product } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const cat = await dbGetCategoryBySlug(slug);
    return { title: cat?.name ?? "Categoria" };
  } catch {
    const cat = mockGetCategoryBySlug(slug);
    return { title: cat?.name ?? "Categoria" };
  }
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;

  // Busca categoria com fallback para mock
  let category: Category | null = null;
  try {
    category = await dbGetCategoryBySlug(slug);
  } catch {
    category = mockGetCategoryBySlug(slug) ?? null;
  }

  if (!category) notFound();

  // Busca subcategorias (categorias-filhas) — só existem no banco real, não no mock
  let children: Category[] = [];
  try {
    children = await dbGetChildCategories(category.id);
  } catch {
    children = [];
  }

  // Exatamente 1 subcategoria ativa: pula a seleção e vai direto pros produtos dela
  if (children.length === 1) {
    redirect(routes.categoria(children[0].slug));
  }

  // Categoria-pai com 2+ subcategorias: produtos de todas elas, com filtro em
  // pílula (TODOS + cada subcategoria). Categoria-folha (sem filhas): produtos
  // dela mesma, sem filtro.
  const categoryIds = children.length > 1 ? children.map((c) => c.id) : [category.id];

  let products: Product[] = [];
  try {
    products = await dbGetProductsByCategoryIds(categoryIds);
  } catch {
    products = mockGetProductsByCategoryIds(categoryIds);
  }

  return (
    <div className="py-16">
      <Container>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted mb-10 flex-wrap">
          <Link href={routes.home} className="hover:text-accent transition-colors">Início</Link>
          <ChevronRight size={12} className="text-muted/50" />
          <span className="text-dark-text/80 font-medium">{category.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-dark-text mb-3 tracking-tight">{category.name}</h1>
            {(category.full_description ?? category.short_description) && (
              <p className="text-muted max-w-2xl leading-relaxed">{category.full_description ?? category.short_description}</p>
            )}
            <p className="text-sm text-muted/70 mt-3">
              {products.length} produto{products.length !== 1 ? "s" : ""} disponíve{products.length !== 1 ? "is" : "l"}
            </p>
          </div>
          <Link href={routes.home} className="flex-shrink-0">
            <span className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors mt-1">
              <ArrowLeft size={15} />
              Voltar
            </span>
          </Link>
        </div>

        {/* Linha dourada */}
        <div className="divider-gold my-10" />

        <ProductShowcase products={products} filterCategories={children.length > 1 ? children : []} />

      </Container>
    </div>
  );
}
