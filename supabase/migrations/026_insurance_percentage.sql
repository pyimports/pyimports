-- =============================================================================
-- 026_insurance_percentage.sql
-- Taxa do seguro da mercadoria (checkout) deixa de ser fixa em 25% no código
-- e passa a ser configurável pelo admin. Armazenada como número inteiro de
-- pontos percentuais (25 = 25%), não fração — mais direto pro admin digitar.
-- =============================================================================

ALTER TABLE store_settings_public
  ADD COLUMN IF NOT EXISTS insurance_percentage NUMERIC NOT NULL DEFAULT 25;
