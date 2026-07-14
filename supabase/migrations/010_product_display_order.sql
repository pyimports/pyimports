-- =============================================================================
-- 010_product_display_order.sql
-- Ordem manual dos produtos dentro de cada categoria, definida por
-- drag-and-drop no painel admin (lista de Produtos, com uma categoria
-- selecionada no filtro). Substitui a ordenação implícita por created_at
-- nas páginas públicas de categoria e nos produtos relacionados.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: usa a ordem de criação atual como ponto de partida, por categoria,
-- para que produtos já cadastrados não fiquem todos empatados em 0.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at ASC) - 1 AS rn
  FROM products
)
UPDATE products
SET display_order = ordered.rn
FROM ordered
WHERE products.id = ordered.id;

CREATE INDEX IF NOT EXISTS idx_products_category_order ON products (category_id, display_order);

COMMENT ON COLUMN products.display_order IS 'Ordem de exibição dentro da categoria — definida por drag-and-drop no admin (painel Produtos, filtrado por categoria).';

-- Column-level security: produtos usam GRANT SELECT por coluna para o role
-- anon (ver 001_initial_schema.sql + 008_fix_anon_product_columns.sql).
-- Necessário para que a página pública de categoria possa ordenar por essa coluna.
GRANT SELECT (display_order) ON TABLE products TO anon;
