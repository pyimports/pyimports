-- =============================================================================
-- 014_product_variants.sql
-- Sistema de variações de produto: um produto (ex. "Camiseta Básica") pode ter
-- N cores, cada cor com sua própria galeria de fotos (+ imagem de hover) e sua
-- própria lista de tamanhos com estoque independente. Nunca um produto por
-- cor — a variação vive dentro do produto.
--
-- Tabelas novas (não reaproveita product_media: ela tem um índice único de
-- "1 imagem principal por produto" incompatível com múltiplas cores).
-- Produtos sem nenhuma linha em product_variants continuam funcionando
-- exatamente como hoje (estoque flat em products.stock).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: product_variants — uma cor de um produto
-- -----------------------------------------------------------------------------

CREATE TABLE product_variants (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name    TEXT        NOT NULL,
  color_hex     TEXT        NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product ON product_variants (product_id, display_order);

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- TABELA: product_variant_media — fotos de uma cor (+ imagem de hover)
-- -----------------------------------------------------------------------------

CREATE TABLE product_variant_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id    UUID        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  storage_path  TEXT,
  is_main       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_hover      BOOLEAN     NOT NULL DEFAULT FALSE,
  display_order INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variant_media_variant ON product_variant_media (variant_id, display_order);

-- No máximo 1 imagem principal e 1 imagem de hover por cor. Hover é opcional
-- (ausência de linha com is_hover=true = card não troca imagem no hover).
CREATE UNIQUE INDEX idx_product_variant_media_main
  ON product_variant_media (variant_id) WHERE is_main = TRUE;
CREATE UNIQUE INDEX idx_product_variant_media_hover
  ON product_variant_media (variant_id) WHERE is_hover = TRUE;

-- -----------------------------------------------------------------------------
-- TABELA: product_variant_sizes — tamanho + estoque de uma cor
-- -----------------------------------------------------------------------------

CREATE TABLE product_variant_sizes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  size       TEXT        NOT NULL,
  stock      INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, size)
);

CREATE INDEX idx_product_variant_sizes_variant ON product_variant_sizes (variant_id);

CREATE TRIGGER trg_product_variant_sizes_updated_at
  BEFORE UPDATE ON product_variant_sizes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- order_items — snapshot de qual cor/tamanho foi comprado
-- -----------------------------------------------------------------------------

ALTER TABLE order_items
  ADD COLUMN variant_size_id    UUID REFERENCES product_variant_sizes(id) ON DELETE SET NULL,
  ADD COLUMN variant_color_name TEXT,
  ADD COLUMN variant_color_hex  TEXT,
  ADD COLUMN variant_size       TEXT;

COMMENT ON COLUMN order_items.variant_size_id IS 'Variação (cor+tamanho) comprada — NULL para produtos sem variação.';

-- -----------------------------------------------------------------------------
-- inventory_movements — rastreabilidade de qual variação teve estoque movido
-- -----------------------------------------------------------------------------

ALTER TABLE inventory_movements
  ADD COLUMN variant_size_id UUID REFERENCES product_variant_sizes(id) ON DELETE SET NULL;

-- =============================================================================
-- RLS — mesmo padrão de product_media, com um hop extra (media/sizes → variant → product)
-- =============================================================================

ALTER TABLE product_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variantes de produtos ativos são públicas"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id AND (p.is_active = TRUE OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam variantes"
  ON product_variants FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "mídias de variantes de produtos ativos são públicas"
  ON product_variant_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = product_variant_media.variant_id AND (p.is_active = TRUE OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam mídias de variantes"
  ON product_variant_media FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "tamanhos de variantes de produtos ativos são públicos"
  ON product_variant_sizes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = product_variant_sizes.variant_id AND (p.is_active = TRUE OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam tamanhos de variantes"
  ON product_variant_sizes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- Rewrite do trigger de baixa de estoque — agora sabe decrementar a variação
-- correta (cor+tamanho) em vez de sempre cair no estoque flat do produto.
-- Mesma função, mesmo trigger, mesma condição de disparo de antes — só o
-- corpo de cada loop bifurca em (tem variação / não tem variação). O branch
-- "não tem variação" é idêntico ao comportamento anterior, byte a byte.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  stock_before INTEGER;
BEGIN
  -- Só age quando status muda para 'payment_confirmed'
  IF NEW.payment_status = 'confirmed' AND (OLD.payment_status IS DISTINCT FROM 'confirmed') THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity, oi.variant_size_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      IF item.variant_size_id IS NOT NULL THEN
        SELECT stock INTO stock_before FROM product_variant_sizes WHERE id = item.variant_size_id;

        UPDATE product_variant_sizes
        SET stock = GREATEST(0, stock - item.quantity),
            updated_at = NOW()
        WHERE id = item.variant_size_id;

        INSERT INTO inventory_movements (
          product_id, variant_size_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          item.variant_size_id,
          'sale',
          -item.quantity,
          stock_before,
          GREATEST(0, stock_before - item.quantity),
          NEW.id,
          'system'
        );
      ELSE
        SELECT stock INTO stock_before FROM products WHERE id = item.product_id;

        UPDATE products
        SET stock = GREATEST(0, stock - item.quantity),
            updated_at = NOW()
        WHERE id = item.product_id;

        INSERT INTO inventory_movements (
          product_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          'sale',
          -item.quantity,
          stock_before,
          GREATEST(0, stock_before - item.quantity),
          NEW.id,
          'system'
        );
      END IF;
    END LOOP;
  END IF;

  -- Devolve estoque quando pedido é cancelado a partir de 'confirmed'
  IF NEW.payment_status != 'confirmed' AND OLD.payment_status = 'confirmed' AND NEW.status = 'cancelled' THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity, oi.variant_size_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      IF item.variant_size_id IS NOT NULL THEN
        SELECT stock INTO stock_before FROM product_variant_sizes WHERE id = item.variant_size_id;

        UPDATE product_variant_sizes
        SET stock = stock + item.quantity,
            updated_at = NOW()
        WHERE id = item.variant_size_id;

        INSERT INTO inventory_movements (
          product_id, variant_size_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          item.variant_size_id,
          'cancelled_return',
          item.quantity,
          stock_before,
          stock_before + item.quantity,
          NEW.id,
          'system'
        );
      ELSE
        SELECT stock INTO stock_before FROM products WHERE id = item.product_id;

        UPDATE products
        SET stock = stock + item.quantity,
            updated_at = NOW()
        WHERE id = item.product_id;

        INSERT INTO inventory_movements (
          product_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          'cancelled_return',
          item.quantity,
          stock_before,
          stock_before + item.quantity,
          NEW.id,
          'system'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
