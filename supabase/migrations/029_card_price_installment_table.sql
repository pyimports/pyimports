-- Corrige o preço no cartão: a migration 028 usou markup fixo de 18%, que
-- estava errado — a taxa real da adquirente varia por parcela (tabela em
-- src/lib/pricing.ts). O preço mostrado na vitrine agora usa a taxa à vista
-- (1x = 6,85%), a mais barata da tabela; o valor por parcela é calculado na
-- hora do pagamento, não fica gravado no produto.
UPDATE products
SET price_card = ROUND(price_pix * 1.0685, 2);
