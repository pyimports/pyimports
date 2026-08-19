-- Busca de produtos "fuzzy": não precisa digitar o nome exatamente igual.
-- Usa pg_trgm (já habilitado na migration 001) pra similaridade textual e
-- unaccent pra ignorar acento (ex: "colageno" encontra "Colágeno").
--
-- A função só retorna id + rank (não os campos completos do produto) —
-- quem chama busca os produtos completos depois com PRODUCT_FIELDS/RLS
-- normal, via .in('id', ids), e reordena pelo rank retornado aqui.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Índice trigram em short_description também, pra acelerar a busca ali
-- (name já tinha idx_products_name_trgm desde a migration 001).
CREATE INDEX IF NOT EXISTS idx_products_short_description_trgm
  ON products USING GIN (short_description gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_products(search_term TEXT, result_limit INT DEFAULT 24)
RETURNS TABLE(id UUID, rank REAL)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    GREATEST(
      similarity(unaccent(p.name), unaccent(search_term)),
      similarity(unaccent(coalesce(p.short_description, '')), unaccent(search_term)) * 0.6,
      similarity(unaccent(p.sku), unaccent(search_term)) * 0.4
    ) AS rank
  FROM products p
  WHERE p.is_active = TRUE
    AND (
      unaccent(p.name) ILIKE '%' || unaccent(search_term) || '%'
      OR unaccent(coalesce(p.short_description, '')) ILIKE '%' || unaccent(search_term) || '%'
      OR unaccent(p.sku) ILIKE '%' || unaccent(search_term) || '%'
      OR similarity(unaccent(p.name), unaccent(search_term)) > 0.2
    )
  ORDER BY rank DESC, p.display_order ASC
  LIMIT result_limit;
$$;

GRANT EXECUTE ON FUNCTION search_products(TEXT, INT) TO anon, authenticated;
