-- A migration 031 trouxe um novo pipeline de status (payment_confirmed ->
-- shipping_link_pending -> shipping_paid -> label_issued -> completed) e
-- deixou os valores antigos (awaiting_validation, awaiting_separation,
-- shipped, delivered) órfãos no enum do Postgres, sem entrada nos mapas de
-- label/cor nem em VALID_TRANSITIONS do código novo. Um pedido real
-- (PY00001) ainda estava com o status antigo "awaiting_separation" e
-- quebrava a tela inteira de Pedidos no admin (VALID_TRANSITIONS[status]
-- retornava undefined, e o código chamava .map()/.includes() em cima disso
-- sem checar).
--
-- Move qualquer pedido nesses status antigos pro início do pipeline novo —
-- não dá pra saber exatamente onde cada um estaria no fluxo de frete/
-- etiqueta novo, então "payment_confirmed" é o destino seguro (já pago,
-- pronto pra entrar no novo fluxo do zero).
UPDATE orders
SET status = 'payment_confirmed'
WHERE status IN ('awaiting_validation', 'awaiting_separation', 'shipped', 'delivered');
