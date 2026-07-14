-- =============================================================================
-- MIGRAÇÃO 002 — Tabela home_banners
-- =============================================================================

CREATE TABLE IF NOT EXISTS home_banners (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  storage_path  TEXT,
  link_url      TEXT,
  link_label    TEXT        NOT NULL DEFAULT 'Ver produtos',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_active_order
  ON home_banners (is_active, display_order);

CREATE TRIGGER trg_home_banners_updated_at
  BEFORE UPDATE ON home_banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode ver banners ativos (usado pela home pública)
CREATE POLICY "home_banners_public_select"
  ON home_banners FOR SELECT
  USING (is_active = TRUE);

-- Apenas admins podem inserir, atualizar e deletar
CREATE POLICY "home_banners_admin_all"
  ON home_banners FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
