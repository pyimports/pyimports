-- =============================================================================
-- 024_announcement_coupon_code.sql
-- Avisos do tipo "cupom" ganham um campo dedicado pro código do cupom, exibido
-- destacado (com botão de copiar) no sino de avisos do site público — antes o
-- código só existia dentro do texto livre da mensagem, sem nenhum destaque.
-- =============================================================================

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;
