import type { Category } from "@/types";

// Fallback usado apenas quando o Supabase está inacessível — espelha a
// estrutura real do banco: Masculino/Feminino (categorias de topo) e suas
// subcategorias (Camisa, Polo, Moletom).
export const mockCategories: Category[] = [
  {
    id: "cat-masculino",
    name: "MASCULINO",
    slug: "masculino",
    short_description: "Camisas e Polos",
    full_description: "Camisetas e polos masculinas com modelagem premium e tecido de alta qualidade.",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
    display_order: 0,
    is_active: true,
    is_featured_home: true,
    product_count: 2,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "cat-feminino",
    name: "FEMININO",
    slug: "feminino",
    short_description: "Camisas e Moletons",
    full_description: "Camisetas e moletons femininos com caimento premium e tecido de alta qualidade.",
    image_url: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600",
    display_order: 1,
    is_active: true,
    is_featured_home: true,
    product_count: 2,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "cat-camisa-masculina",
    parent_id: "cat-masculino",
    name: "Camisa",
    slug: "camisa-masculina",
    short_description: "Camisetas masculinas premium.",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
    display_order: 0,
    is_active: true,
    is_featured_home: false,
    product_count: 1,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "cat-polo-masculina",
    parent_id: "cat-masculino",
    name: "Polo",
    slug: "polo-masculina",
    short_description: "Polos masculinas premium.",
    image_url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600",
    display_order: 1,
    is_active: true,
    is_featured_home: false,
    product_count: 1,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "cat-camisa-feminina",
    parent_id: "cat-feminino",
    name: "Camisa",
    slug: "camisa-feminina",
    short_description: "Camisetas femininas premium.",
    image_url: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600",
    display_order: 0,
    is_active: true,
    is_featured_home: false,
    product_count: 1,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "cat-moletom-feminino",
    parent_id: "cat-feminino",
    name: "Moletom",
    slug: "moletom-feminino",
    short_description: "Moletons femininos premium.",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600",
    display_order: 1,
    is_active: true,
    is_featured_home: false,
    product_count: 1,
    created_at: "2026-06-24T10:00:00Z",
    updated_at: "2026-06-24T10:00:00Z",
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  mockCategories.find((c) => c.slug === slug);

export const getFeaturedCategories = (): Category[] =>
  mockCategories.filter((c) => c.is_featured_home && c.is_active);
