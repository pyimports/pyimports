-- Troca o prefixo do número do pedido de "RF" pra "PY" (RF00001 -> PY00001),
-- tanto nos pedidos já existentes quanto nos futuros. A numeração em si não
-- muda, só o prefixo — os pedidos já estão sequenciais por data de criação.

UPDATE orders
SET order_number = 'PY' || SUBSTRING(order_number FROM 3)
WHERE order_number LIKE 'RF%';

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
  SELECT 'PY' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
$$ LANGUAGE sql;
