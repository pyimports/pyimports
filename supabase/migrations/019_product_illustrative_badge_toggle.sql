-- =============================================================================
-- 019_product_illustrative_badge_toggle.sql
-- Liga/desliga por produto o aviso "Imagem meramente ilustrativa" exibido
-- sobre a foto no card (ver ProductCard.tsx). Default TRUE preserva o
-- comportamento atual (aviso sempre visível) para produtos já existentes.
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS show_illustrative_badge BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN products.show_illustrative_badge IS 'Mostra o aviso "Imagem meramente ilustrativa" sobre a foto do produto no card.';

-- Column-level security: produtos usam GRANT SELECT por coluna para o role
-- anon (ver 001_initial_schema.sql + 008_fix_anon_product_columns.sql) —
-- sem isso, a leitura pública do produto falha silenciosamente e cai no
-- fallback de dados mock.
GRANT SELECT (show_illustrative_badge) ON TABLE products TO anon;
