-- =============================================================================
-- 007_category_image_framing.sql
-- Enquadramento de imagem (posição/zoom) para o card de categoria, separado
-- por desktop e mobile — mesmo padrão já usado em home_banners e reviews.
-- =============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_object_position_x NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_object_position_y NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_scale NUMERIC(4,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mobile_image_object_position_x NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mobile_image_object_position_y NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mobile_image_scale NUMERIC(4,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN categories.image_object_position_x IS 'Posição horizontal do foco da imagem desktop (0-100%)';
COMMENT ON COLUMN categories.image_object_position_y IS 'Posição vertical do foco da imagem desktop (0-100%)';
COMMENT ON COLUMN categories.image_scale IS 'Zoom da imagem desktop (1 = 100%, até 3 = 300%)';
COMMENT ON COLUMN categories.mobile_image_object_position_x IS 'Posição horizontal do foco da imagem mobile (0-100%)';
COMMENT ON COLUMN categories.mobile_image_object_position_y IS 'Posição vertical do foco da imagem mobile (0-100%)';
COMMENT ON COLUMN categories.mobile_image_scale IS 'Zoom da imagem mobile (1 = 100%, até 3 = 300%)';
