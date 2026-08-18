-- -----------------------------------------------------------------------------
-- Permite o admin criar uma avaliação 100% manual, sem vínculo com um pedido
-- real do sistema (order_id/customer_cpf viram opcionais nesse caso).
-- -----------------------------------------------------------------------------

ALTER TABLE customer_reviews ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE customer_reviews ALTER COLUMN customer_cpf DROP NOT NULL;
ALTER TABLE customer_reviews ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT false;
