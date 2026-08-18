-- Todos os preços no Pix passam a terminar em ",90" (ex: 850 -> 850,90).
-- price_card é recalculado junto, seguindo a mesma taxa à vista da PYX Gate
-- (8,85%) já usada nas migrations anteriores.
UPDATE products
SET
  price_pix = FLOOR(price_pix) + 0.90,
  price_card = ROUND((FLOOR(price_pix) + 0.90) * 1.0885, 2);
