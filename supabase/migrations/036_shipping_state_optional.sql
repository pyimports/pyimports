-- O campo Estado saiu do checkout (frete agora é valor fixo, não depende
-- mais do estado do cliente) — a coluna não pode mais ser NOT NULL.
ALTER TABLE orders ALTER COLUMN shipping_state DROP NOT NULL;
