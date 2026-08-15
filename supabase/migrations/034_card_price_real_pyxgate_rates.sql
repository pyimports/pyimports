-- Corrige o preço no cartão pra taxa REAL da conta PYX Gate (confirmada no
-- painel "Minhas Taxas") — o valor anterior (6,85%) vinha de um flyer
-- genérico, diferente do que a conta realmente cobra (8,85% à vista).
UPDATE products
SET price_card = ROUND(price_pix * 1.0885, 2);
