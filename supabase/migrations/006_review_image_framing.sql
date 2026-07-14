-- =============================================================================
-- 006_review_image_framing.sql
-- Enquadramento de imagem (posição/zoom) para o card de feedback premium,
-- mesmo padrão já usado em home_banners.
-- =============================================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS image_object_position_x NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_object_position_y NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_scale NUMERIC(4,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN reviews.image_object_position_x IS 'Posição horizontal do foco da imagem (0-100%), igual ao enquadramento de banners';
COMMENT ON COLUMN reviews.image_object_position_y IS 'Posição vertical do foco da imagem (0-100%)';
COMMENT ON COLUMN reviews.image_scale IS 'Zoom da imagem (1 = 100%, até 3 = 300%)';
