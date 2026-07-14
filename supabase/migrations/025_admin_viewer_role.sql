-- =============================================================================
-- 025_admin_viewer_role.sql
-- Papel "viewer": conta admin somente-leitura. Loga e vê tudo no painel, mas
-- toda escrita (criar/editar/excluir/upload) é bloqueada no servidor — não é
-- só uma restrição visual, é reforçado em cada Server Action/Route Handler.
-- =============================================================================

ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';
