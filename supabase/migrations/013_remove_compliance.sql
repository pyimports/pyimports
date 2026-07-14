-- =============================================================================
-- 013_remove_compliance.sql
-- A loja deixou de vender produtos regulados (peptídeos/medicamentos) e passou
-- a vender camisetas. O sistema de "conformidade" (compliance_type,
-- requires_validation, allow_direct_buy) existia só para gerenciar a venda de
-- substâncias reguladas e não tem mais nenhum uso — remove por completo.
-- allow_whatsapp é mantido: é um recurso genérico de contato, não específico
-- de remédio.
-- =============================================================================

ALTER TABLE products
  DROP COLUMN IF EXISTS compliance_type,
  DROP COLUMN IF EXISTS requires_validation,
  DROP COLUMN IF EXISTS allow_direct_buy;

DROP TYPE IF EXISTS compliance_type;
