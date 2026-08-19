-- Corrige busca de produto com nome curto/pontuado (ex: produto "T.G",
-- buscar "tg" não achava nada) — o ILIKE comparava a string crua, então o
-- ponto no meio do nome ("t.g") quebrava o match contra "tg" digitado sem
-- pontuação. Remove tudo que não é letra/número dos dois lados antes de
-- comparar por substring.

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
      regexp_replace(unaccent(p.name), '[^a-zA-Z0-9]', '', 'g')
        ILIKE '%' || regexp_replace(unaccent(search_term), '[^a-zA-Z0-9]', '', 'g') || '%'
      OR unaccent(coalesce(p.short_description, '')) ILIKE '%' || unaccent(search_term) || '%'
      OR unaccent(p.sku) ILIKE '%' || unaccent(search_term) || '%'
      OR similarity(unaccent(p.name), unaccent(search_term)) > 0.2
    )
  ORDER BY rank DESC, p.display_order ASC
  LIMIT result_limit;
$$;
