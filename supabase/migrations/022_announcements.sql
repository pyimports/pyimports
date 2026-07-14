-- =============================================================================
-- 022_announcements.sql
-- Avisos exibidos no sino do navbar público — promoções, cupons de desconto
-- e avisos gerais. Gerenciados pelo admin, mostrados por ordem/ativos.
-- =============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL DEFAULT 'aviso' CHECK (type IN ('promocao', 'cupom', 'aviso')),
  title         TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_order
  ON announcements (is_active, display_order);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mesmo padrão de home_banners (001/002): leitura pública só do que
-- está ativo, escrita só para admin.
-- ---------------------------------------------------------------------------

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_select"
  ON announcements FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "announcements_admin_all"
  ON announcements FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
