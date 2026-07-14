-- =============================================================================
-- 023_settings_functional.sql
-- Torna a tela /admin/configuracoes funcional de verdade:
-- - Loja precisa de um campo de CNPJ/CPF (não existia coluna)
-- - WhatsApp precisa de uma mensagem padrão configurável (só existia o número)
-- store_settings_public não tem REVOKE/GRANT customizado (ver 001), então
-- essas colunas novas já ficam visíveis ao anon pela concessão padrão do
-- Supabase na tabela inteira — sem precisar de GRANT extra.
-- =============================================================================

ALTER TABLE store_settings_public
  ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_default_message TEXT NOT NULL DEFAULT 'Olá! Vim pela loja e tenho uma dúvida.';
