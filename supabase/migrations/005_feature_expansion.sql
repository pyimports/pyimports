-- =============================================================================
-- 005_feature_expansion.sql
-- Estoque opcional/ilimitado, promoção por quantidade, banners vinculados a
-- produto/categoria, e módulo de feedbacks/avaliações.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRODUCTS — estoque opcional/ilimitado + promoção por quantidade
-- -----------------------------------------------------------------------------

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quantity_pricing_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_tiers JSONB NULL; -- [{quantity:int, unit_price:number}], quantity > 1

-- stock=NULL passa a significar "estoque ilimitado" quando track_stock=false
ALTER TABLE products
  ALTER COLUMN stock DROP NOT NULL;

COMMENT ON COLUMN products.track_stock IS 'false = estoque ilimitado (stock é ignorado/pode ser NULL)';
COMMENT ON COLUMN products.price_tiers IS 'Promoção por quantidade: array de {quantity, unit_price}. Quantidade 1 sempre usa price_pix.';

-- Trigger de estoque baixo deve ignorar produtos com estoque ilimitado
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_stock = false OR NEW.stock IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.stock <= NEW.stock_minimum AND (OLD.stock IS DISTINCT FROM NEW.stock) THEN
    INSERT INTO notifications (type, title, body, data)
    VALUES (
      'stock_alert',
      'Estoque baixo: ' || NEW.name,
      'O produto "' || NEW.name || '" está com ' || NEW.stock || ' unidades (mínimo: ' || NEW.stock_minimum || ').',
      jsonb_build_object('product_id', NEW.id, 'stock', NEW.stock, 'stock_minimum', NEW.stock_minimum)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- HOME_BANNERS — destino estruturado (produto/categoria/url)
-- -----------------------------------------------------------------------------

ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'url'
    CHECK (link_type IN ('product', 'category', 'url')),
  ADD COLUMN IF NOT EXISTS link_product_id UUID NULL REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN home_banners.link_type IS 'Origem do link_url: produto/categoria selecionados (gera link_url automaticamente) ou url digitada manualmente';

-- -----------------------------------------------------------------------------
-- REVIEWS — feedbacks/avaliações de clientes (home + admin)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reviews (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name        TEXT NOT NULL,
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 5),
  state                TEXT NOT NULL,
  delivery_days_label  TEXT NOT NULL,
  comment              TEXT NOT NULL,
  image_url            TEXT NULL,
  image_storage_path   TEXT NULL,
  video_url            TEXT NULL,
  product_id           UUID NULL REFERENCES products(id) ON DELETE SET NULL,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  display_order        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_active_order ON reviews (is_active, display_order);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_select_active" ON reviews
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "reviews_admin_all" ON reviews
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- STORAGE — bucket público para imagens de feedbacks
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reviews', 'reviews', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reviews_bucket_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'reviews');

CREATE POLICY "reviews_bucket_admin_write" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'reviews' AND is_admin());

CREATE POLICY "reviews_bucket_admin_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'reviews' AND is_admin());
