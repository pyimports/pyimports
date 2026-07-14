-- =============================================================================
-- 016_product_colors.sql
-- Curadoria de cores por produto vinculado a uma peça do estoque. Hoje, um
-- produto com stock_item_id herda TODAS as cores da peça, na ordem que o
-- Estoque definiu (ver attachStockItemVariants em variant-mappers.ts) — sem
-- nenhuma forma de escolher subconjunto, ordenar, marcar principal, ou
-- ajustar imagens por produto. Esta migration cria a camada de curadoria,
-- sem nunca duplicar tamanho/SKU/quantidade (que continuam 100% vivos em
-- product_variant_sizes, lidos via variant_id).
--
-- product_colors      — quais cores da peça aparecem neste produto, em que
--                        ordem, e qual é a principal.
-- product_color_images — cópia/snapshot das imagens por cor, no momento em
--                        que a cor é adicionada ao produto. O produto pode
--                        adicionar, reordenar ou remover imagens aqui sem
--                        nunca afetar product_variant_media (Estoque).
-- =============================================================================

CREATE TABLE product_colors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    UUID        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  display_order INTEGER     NOT NULL DEFAULT 1,
  is_main       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, variant_id)
);

CREATE INDEX idx_product_colors_product ON product_colors (product_id, display_order);
CREATE UNIQUE INDEX idx_product_colors_main ON product_colors (product_id) WHERE is_main = TRUE;

CREATE TRIGGER trg_product_colors_updated_at
  BEFORE UPDATE ON product_colors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE product_colors IS 'Curadoria de quais cores de uma peça do estoque aparecem em um produto vinculado, em que ordem, e qual é a principal. Nunca duplica tamanho/SKU/quantidade.';

-- -----------------------------------------------------------------------------
-- product_color_images — snapshot das imagens por cor dentro do produto
-- -----------------------------------------------------------------------------

CREATE TABLE product_color_images (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_color_id UUID        NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
  url              TEXT        NOT NULL,
  storage_path     TEXT,                                  -- só preenchido quando source = 'upload' (arquivo próprio do produto)
  source           TEXT        NOT NULL CHECK (source IN ('stock', 'upload')),
  stock_media_id   UUID        REFERENCES product_variant_media(id) ON DELETE SET NULL, -- proveniência apenas — nunca cascadeia a remoção da imagem do produto
  is_primary       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_hover         BOOLEAN     NOT NULL DEFAULT FALSE,     -- paridade com product_variant_media — usado em ProductCard.tsx
  display_order    INTEGER     NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_color_images_color ON product_color_images (product_color_id, display_order);
CREATE UNIQUE INDEX idx_product_color_images_primary ON product_color_images (product_color_id) WHERE is_primary = TRUE;
CREATE UNIQUE INDEX idx_product_color_images_hover ON product_color_images (product_color_id) WHERE is_hover = TRUE;

COMMENT ON COLUMN product_color_images.source IS 'stock = cópia importada de product_variant_media (o produto não é dono do arquivo); upload = enviado direto neste produto (o produto é dono do arquivo e deve limpar o storage ao remover).';

-- =============================================================================
-- RLS — mesmo padrão de 015_stock_items.sql: leitura pública quando o produto
-- está ativo (ou admin), escrita só admin.
-- =============================================================================

ALTER TABLE product_colors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_color_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cores curadas de produtos ativos são públicas"
  ON product_colors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_colors.product_id AND (p.is_active OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam cores curadas"
  ON product_colors FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "imagens de cores curadas de produtos ativos são públicas"
  ON product_color_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_colors pc
      JOIN products p ON p.id = pc.product_id
      WHERE pc.id = product_color_images.product_color_id AND (p.is_active OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam imagens de cores curadas"
  ON product_color_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- Backfill — produtos já vinculados a uma peça ganham product_colors e
-- product_color_images preservando EXATAMENTE o comportamento atual: todas as
-- cores ativas da peça, na ordem da peça, primeira = principal. Garante zero
-- mudança de comportamento para produtos já publicados; nenhuma ação manual
-- do admin é necessária.
-- =============================================================================

WITH ranked AS (
  SELECT
    p.id AS product_id,
    v.id AS variant_id,
    v.display_order,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY v.display_order, v.created_at) AS rn
  FROM products p
  JOIN product_variants v ON v.stock_item_id = p.stock_item_id
  WHERE p.stock_item_id IS NOT NULL AND v.is_active = TRUE
),
inserted_colors AS (
  INSERT INTO product_colors (product_id, variant_id, display_order, is_main)
  SELECT product_id, variant_id, display_order, (rn = 1)
  FROM ranked
  RETURNING id, product_id, variant_id
)
INSERT INTO product_color_images (product_color_id, url, storage_path, source, stock_media_id, is_primary, is_hover, display_order)
SELECT ic.id, m.url, m.storage_path, 'stock', m.id, m.is_main, m.is_hover, m.display_order
FROM inserted_colors ic
JOIN product_variant_media m ON m.variant_id = ic.variant_id;
