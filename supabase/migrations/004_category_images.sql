-- Migration 004: Campos de imagem para categorias
-- Adiciona suporte a imagem desktop, imagem mobile e seus storage paths

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_storage_path        TEXT NULL,
  ADD COLUMN IF NOT EXISTS mobile_image_url          TEXT NULL,
  ADD COLUMN IF NOT EXISTS mobile_image_storage_path TEXT NULL;

COMMENT ON COLUMN categories.image_url
  IS 'URL pública da imagem desktop da categoria (Supabase Storage)';

COMMENT ON COLUMN categories.image_storage_path
  IS 'Caminho relativo no bucket category-images para a imagem desktop';

COMMENT ON COLUMN categories.mobile_image_url
  IS 'URL pública da imagem mobile (opcional, usa desktop como fallback)';

COMMENT ON COLUMN categories.mobile_image_storage_path
  IS 'Caminho relativo no bucket category-images para a imagem mobile';
