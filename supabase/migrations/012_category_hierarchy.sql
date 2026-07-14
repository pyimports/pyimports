-- =============================================================================
-- 012_category_hierarchy.sql
-- Hierarquia de categorias em 2 níveis: categorias-pai (ex: Masculino,
-- Feminino) e subcategorias (ex: Camisa, Polo, Moletom). Produtos continuam
-- vinculados sempre à categoria "folha" (subcategoria) via products.category_id,
-- sem nenhuma mudança nessa relação.
-- =============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

COMMENT ON COLUMN categories.parent_id IS 'Categoria-pai (NULL = categoria de topo, ex: Masculino/Feminino). Subcategorias referenciam a categoria-pai aqui.';
