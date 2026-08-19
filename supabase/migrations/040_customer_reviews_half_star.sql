-- -----------------------------------------------------------------------------
-- Permite nota com meia-estrela (1, 1.5, 2, 2.5, ..., 5) nas avaliações.
-- -----------------------------------------------------------------------------

ALTER TABLE customer_reviews DROP CONSTRAINT IF EXISTS customer_reviews_rating_check;
ALTER TABLE customer_reviews ALTER COLUMN rating TYPE NUMERIC(2, 1) USING rating::numeric(2, 1);
ALTER TABLE customer_reviews ADD CONSTRAINT customer_reviews_rating_check
  CHECK (rating >= 1 AND rating <= 5 AND (rating * 2) = ROUND(rating * 2));
