-- -----------------------------------------------------------------------------
-- CUSTOMER_REVIEWS — avaliação enviada pelo próprio cliente, vinculada a um
-- pedido real (verificado por CPF), com aprovação do admin antes de aparecer
-- na aba pública /avaliacoes. Diferente da tabela "reviews" existente, que são
-- depoimentos digitados manualmente pelo admin para a home.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_cpf    TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  order_number    TEXT NOT NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  service_rating  TEXT NOT NULL CHECK (service_rating IN ('pessimo', 'ruim', 'bom', 'excelente')),
  purchase_date   TIMESTAMPTZ NOT NULL,
  delivery_date   DATE NOT NULL,
  description     TEXT NOT NULL,
  products        JSONB NOT NULL DEFAULT '[]',
  images          TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_status ON customer_reviews (status, created_at DESC);

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_reviews_public_select_approved" ON customer_reviews
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "customer_reviews_admin_all" ON customer_reviews
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- STORAGE — bucket público para as fotos enviadas pelo cliente na avaliação
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-review-images', 'customer-review-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "customer_review_images_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'customer-review-images');

CREATE POLICY "customer_review_images_admin_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'customer-review-images' AND is_admin());
