-- =============================================================================
-- Novo formato de número de pedido: RF00001, RF00002, ... (sem data embutida)
-- Substitui o formato anterior ORD-YYYYMMDD-NNNN.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
  SELECT 'RF' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
$$ LANGUAGE sql;

-- Reinicia a sequência para o próximo pedido sair como RF00001.
-- Só reinicia se não houver pedidos ainda (evita colidir com order_number já existente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders) THEN
    ALTER SEQUENCE order_number_seq RESTART WITH 1;
  END IF;
END $$;
