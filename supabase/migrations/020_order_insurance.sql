-- =============================================================================
-- 020_order_insurance.sql
-- Seguro opcional da mercadoria (reenvio em caso de extravio/avaria),
-- escolhido pelo cliente no carrinho. Valor fixo por caixa/item, recalculado
-- e gravado no pedido no momento da compra (nunca confia no valor do client).
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS insurance_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_value   NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (insurance_value >= 0);

COMMENT ON COLUMN orders.insurance_enabled IS 'Cliente optou pelo seguro da mercadoria neste pedido.';
COMMENT ON COLUMN orders.insurance_value   IS 'Valor cobrado pelo seguro (quantidade de itens x R$89,90 no momento da compra).';
