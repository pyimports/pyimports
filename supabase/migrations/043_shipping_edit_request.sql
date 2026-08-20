-- Permite o cliente pedir pra corrigir nome/ID do pedido que já enviou
-- (errou na digitação, por exemplo). O admin precisa autorizar antes do
-- cliente conseguir reenviar — nunca edita direto sozinho.
ALTER TABLE orders
  ADD COLUMN shipping_edit_requested_at  TIMESTAMPTZ,
  ADD COLUMN shipping_edit_authorized_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.shipping_edit_requested_at IS 'Cliente pediu pra corrigir nome/ID do pedido de frete que já enviou';
COMMENT ON COLUMN orders.shipping_edit_authorized_at IS 'Admin autorizou a correção — some assim que o cliente reenvia com sucesso';
