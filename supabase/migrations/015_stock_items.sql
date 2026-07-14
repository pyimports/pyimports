-- =============================================================================
-- 015_stock_items.sql
-- Desacopla estoque (cor + tamanho + SKU + quantidade) de produto. Cria a
-- entidade "stock_items" (peça real da loja, reutilizável) e permite que
-- product_variants pertença OU a um product_id (modo legado/manual, sem
-- nenhuma mudança de comportamento) OU a um stock_item_id (peça nova).
-- 1 peça = 1 produto (UNIQUE em products.stock_item_id).
--
-- Não toca no trigger record_inventory_movement() — ele já decrementa
-- product_variant_sizes por id, que continua existindo igual, só com um
-- "dono" possivelmente diferente. A baixa atômica continua funcionando.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: stock_items — peça base reutilizável de estoque
-- -----------------------------------------------------------------------------

CREATE TABLE stock_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  base_sku    TEXT        NOT NULL UNIQUE,
  category_id UUID        REFERENCES categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_items_active ON stock_items (is_active);
CREATE INDEX idx_stock_items_name_trgm ON stock_items USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- product_variants — passa a aceitar OU product_id OU stock_item_id
-- -----------------------------------------------------------------------------

ALTER TABLE product_variants
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD CONSTRAINT product_variants_owner_check CHECK (
    (product_id IS NOT NULL AND stock_item_id IS NULL) OR
    (product_id IS NULL AND stock_item_id IS NOT NULL)
  );

CREATE INDEX idx_product_variants_stock_item ON product_variants (stock_item_id);

COMMENT ON COLUMN product_variants.stock_item_id IS 'Dono alternativo da variante: uma peça de estoque reutilizável, em vez de um produto direto.';

-- -----------------------------------------------------------------------------
-- product_variant_sizes — SKU próprio + alerta de estoque baixo + status
-- -----------------------------------------------------------------------------

ALTER TABLE product_variant_sizes
  ADD COLUMN sku TEXT,
  ADD COLUMN low_stock_alert INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- -----------------------------------------------------------------------------
-- products — vínculo opcional a uma peça do estoque (1 peça = 1 produto)
-- -----------------------------------------------------------------------------

ALTER TABLE products
  ADD COLUMN stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT products_stock_item_unique UNIQUE (stock_item_id);

COMMENT ON COLUMN products.stock_item_id IS 'Quando preenchido, as variações (cor/tamanho/estoque/imagens) do produto vêm desta peça, não de product_variants.product_id.';

-- -----------------------------------------------------------------------------
-- order_items — snapshot do SKU da variação comprada
-- -----------------------------------------------------------------------------

ALTER TABLE order_items ADD COLUMN variant_sku TEXT;

-- =============================================================================
-- RLS — stock_items
-- =============================================================================

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peças ativas são públicas"
  ON stock_items FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "apenas admins gerenciam peças"
  ON stock_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- Corrige as 3 policies públicas de variantes/mídia/tamanhos — hoje fazem
-- JOIN em products via product_id, que fica NULL quando o dono é uma peça,
-- o que tornaria a variante invisível mesmo sendo pública. Passam a aceitar
-- os dois casos (dono = produto OU dono = peça).
-- -----------------------------------------------------------------------------

DROP POLICY "variantes de produtos ativos são públicas" ON product_variants;
CREATE POLICY "variantes ativas são públicas"
  ON product_variants FOR SELECT
  USING (
    (product_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND (p.is_active OR is_admin())
    ))
    OR
    (stock_item_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM stock_items s WHERE s.id = product_variants.stock_item_id AND (s.is_active OR is_admin())
    ))
  );

DROP POLICY "mídias de variantes de produtos ativos são públicas" ON product_variant_media;
CREATE POLICY "mídias de variantes ativas são públicas"
  ON product_variant_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.id = product_variant_media.variant_id
        AND (
          (v.product_id IS NOT NULL AND EXISTS (SELECT 1 FROM products p WHERE p.id = v.product_id AND (p.is_active OR is_admin())))
          OR
          (v.stock_item_id IS NOT NULL AND EXISTS (SELECT 1 FROM stock_items s WHERE s.id = v.stock_item_id AND (s.is_active OR is_admin())))
        )
    )
  );

DROP POLICY "tamanhos de variantes de produtos ativos são públicos" ON product_variant_sizes;
CREATE POLICY "tamanhos de variantes ativas são públicos"
  ON product_variant_sizes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.id = product_variant_sizes.variant_id
        AND (
          (v.product_id IS NOT NULL AND EXISTS (SELECT 1 FROM products p WHERE p.id = v.product_id AND (p.is_active OR is_admin())))
          OR
          (v.stock_item_id IS NOT NULL AND EXISTS (SELECT 1 FROM stock_items s WHERE s.id = v.stock_item_id AND (s.is_active OR is_admin())))
        )
    )
  );

-- -----------------------------------------------------------------------------
-- Column-level security: `products` usa GRANT SELECT por coluna pro role
-- `anon` (ver 001_initial_schema.sql e o fix em 008_fix_anon_product_columns.sql
-- — esquecer essa concessão já causou "permission denied" silencioso na loja
-- antes). stock_item_id é nova e precisa entrar nesse allow-list.
-- -----------------------------------------------------------------------------

GRANT SELECT (stock_item_id) ON TABLE products TO anon;
