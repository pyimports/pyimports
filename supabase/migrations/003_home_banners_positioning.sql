-- =============================================================================
-- MIGRAÇÃO 003 — Posicionamento e imagem mobile para home_banners
-- Segura: usa ADD COLUMN IF NOT EXISTS com DEFAULT em todas as colunas
-- Banners já cadastrados recebem valores padrão automaticamente
-- =============================================================================

ALTER TABLE home_banners
  ADD COLUMN IF NOT EXISTS image_mobile_url    TEXT,
  ADD COLUMN IF NOT EXISTS mobile_storage_path TEXT,

  -- Enquadramento Desktop
  ADD COLUMN IF NOT EXISTS desktop_object_position_x NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS desktop_object_position_y NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS desktop_scale             NUMERIC(4,2) NOT NULL DEFAULT 1,

  -- Enquadramento Mobile
  ADD COLUMN IF NOT EXISTS mobile_object_position_x  NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mobile_object_position_y  NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS mobile_scale              NUMERIC(4,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN home_banners.desktop_object_position_x IS '0 = esquerda, 100 = direita, 50 = centro';
COMMENT ON COLUMN home_banners.desktop_object_position_y IS '0 = topo, 100 = base, 50 = centro';
COMMENT ON COLUMN home_banners.desktop_scale             IS '1.0 = normal, 2.0 = 200% zoom';
COMMENT ON COLUMN home_banners.mobile_object_position_x  IS '0 = esquerda, 100 = direita, 50 = centro';
COMMENT ON COLUMN home_banners.mobile_object_position_y  IS '0 = topo, 100 = base, 50 = centro';
COMMENT ON COLUMN home_banners.mobile_scale              IS '1.0 = normal, 2.0 = 200% zoom';
