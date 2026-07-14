-- =============================================================================
-- 011_review_multiple_products.sql
-- Um feedback pode estar relacionado a vários produtos (o cliente comprou
-- mais de um item no mesmo pedido). Substitui a coluna product_id (singular)
-- por product_ids (array), seguindo o mesmo padrão já usado em
-- coupons.restricted_products.
-- =============================================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS product_ids UUID[] NOT NULL DEFAULT '{}';

-- Backfill: migra o produto único já vinculado para o novo array
UPDATE reviews
SET product_ids = ARRAY[product_id]
WHERE product_id IS NOT NULL AND product_ids = '{}';

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE reviews DROP COLUMN IF EXISTS product_id;

COMMENT ON COLUMN reviews.product_ids IS 'Produtos relacionados a este feedback — um cliente pode ter comprado vários itens no mesmo pedido.';

-- Defensivo: garante leitura pública da tabela inteira (a home já lê reviews
-- via select("*") com a chave anon, então não há column-level security aqui).
GRANT SELECT ON TABLE reviews TO anon;
