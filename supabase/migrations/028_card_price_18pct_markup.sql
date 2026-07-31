-- Recalcula o preço no cartão de TODOS os produtos como Pix + 18% — regra
-- fixa aplicada em todo o catálogo (a partir de agora, criar/editar produto
-- sempre recalcula isso sozinho, ver computeCardPrice em src/lib/pricing.ts).
UPDATE products
SET price_card = ROUND(price_pix * 1.18, 2);
