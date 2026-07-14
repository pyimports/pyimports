-- =============================================================================
-- 021_product_fulfillment_badge.sql
-- Substitui o selo fixo "ORIGINAL" por um selo de disponibilidade opcional e
-- mutuamente exclusivo: "Pronta entrega" OU "Sob encomenda" (ou nenhum).
-- =============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NULL
    CHECK (fulfillment_type IN ('pronta_entrega', 'sob_encomenda'));

COMMENT ON COLUMN products.fulfillment_type IS 'Selo de disponibilidade no card: pronta_entrega, sob_encomenda, ou NULL (nenhum selo). Mutuamente exclusivo.';

-- Column-level security: produtos usam GRANT SELECT por coluna para o role
-- anon (ver 001_initial_schema.sql + 008_fix_anon_product_columns.sql) —
-- sem isso, a leitura pública do produto falha silenciosamente e cai no
-- fallback de dados mock.
GRANT SELECT (fulfillment_type) ON TABLE products TO anon;
