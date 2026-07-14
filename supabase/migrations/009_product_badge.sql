-- =============================================================================
-- 009_product_badge.sql
-- Selo/badge customizado por produto: imagem enviada pelo admin, posicionada
-- livremente (x/y em %) e redimensionável (largura em % do card), exibida
-- por cima do card do produto exatamente como configurado.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS badge_image_url     TEXT    NULL,
  ADD COLUMN IF NOT EXISTS badge_storage_path  TEXT    NULL,
  ADD COLUMN IF NOT EXISTS badge_position_x    NUMERIC NOT NULL DEFAULT 50 CHECK (badge_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS badge_position_y    NUMERIC NOT NULL DEFAULT 50 CHECK (badge_position_y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS badge_width_pct     NUMERIC NOT NULL DEFAULT 25 CHECK (badge_width_pct BETWEEN 1 AND 100);

COMMENT ON COLUMN products.badge_image_url    IS 'URL pública da imagem do selo no storage (product-images). NULL = sem selo.';
COMMENT ON COLUMN products.badge_storage_path IS 'Path no storage para permitir exclusão — nunca exposto ao público (mesmo padrão de image_storage_path em categories).';
COMMENT ON COLUMN products.badge_position_x   IS 'Posição horizontal do centro do selo, em % da largura do card (0-100).';
COMMENT ON COLUMN products.badge_position_y   IS 'Posição vertical do centro do selo, em % da altura do card (0-100).';
COMMENT ON COLUMN products.badge_width_pct    IS 'Largura do selo em % da largura do card — altura é proporcional (aspect ratio natural da imagem).';

-- Column-level security: produtos usam GRANT SELECT por coluna para o role
-- anon (ver 001_initial_schema.sql + 008_fix_anon_product_columns.sql).
-- badge_storage_path é uso interno do admin e NÃO entra nesta lista.
GRANT SELECT (
  badge_image_url, badge_position_x, badge_position_y, badge_width_pct
) ON TABLE products TO anon;
