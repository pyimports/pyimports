-- =============================================================================
-- 017_order_tracking_lookup.sql
-- Suporte a rastreio real (tracking_code/tracking_url) e busca pública segura
-- de pedidos por número/CPF/e-mail (tela "Acompanhar Pedido"). Sem isso, a
-- página pública nunca teria rastreio real pra mostrar (não existia nenhum
-- campo no banco) e a busca por CPF não tinha como ser protegida contra
-- abuso (sem nenhum rate limit no projeto até aqui).
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN tracking_code TEXT,
  ADD COLUMN tracking_url  TEXT;

COMMENT ON COLUMN orders.tracking_code IS 'Código de rastreio da transportadora, preenchido manualmente pelo Admin.';
COMMENT ON COLUMN orders.tracking_url  IS 'Link de rastreio direto da transportadora, se houver.';

-- Acelera a busca pública por CPF (customers.cpf_cnpj é opcional, então só
-- indexa quem realmente informou).
CREATE INDEX idx_customers_cpf ON customers (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

-- -----------------------------------------------------------------------------
-- order_lookup_attempts — rate limiting da busca pública de pedidos. Guarda só
-- o hash do IP (nunca o IP em texto puro) + timestamp; sem nenhuma policy
-- pública — só é tocada via service client dentro das Server Actions, igual
-- ao restante do projeto.
-- -----------------------------------------------------------------------------

CREATE TABLE order_lookup_attempts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_lookup_attempts_ip ON order_lookup_attempts (ip_hash, created_at);

ALTER TABLE order_lookup_attempts ENABLE ROW LEVEL SECURITY;
