-- =============================================================================
-- 008_fix_anon_product_columns.sql
-- CORREÇÃO CRÍTICA: a migration 005 adicionou track_stock, quantity_pricing_enabled
-- e price_tiers a `products`, mas a tabela usa GRANT SELECT por coluna para o
-- role `anon` (column-level security, ver 001_initial_schema.sql). As 3 colunas
-- novas nunca foram adicionadas a esse allow-list, então toda leitura pública
-- de produtos (home, catálogo, página de produto) passou a falhar com
-- "permission denied for table products" e caía silenciosamente no fallback
-- de dados mock.
-- =============================================================================

GRANT SELECT (
  track_stock, quantity_pricing_enabled, price_tiers
) ON TABLE products TO anon;
