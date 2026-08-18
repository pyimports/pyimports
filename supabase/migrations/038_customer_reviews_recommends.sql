-- -----------------------------------------------------------------------------
-- Troca a avaliação de atendimento (Péssimo/Ruim/Bom/Excelente) por uma
-- pergunta direta: "Você recomenda a gente?" (Sim/Não).
-- -----------------------------------------------------------------------------

ALTER TABLE customer_reviews ADD COLUMN recommends BOOLEAN;

UPDATE customer_reviews SET recommends = true WHERE service_rating IN ('bom', 'excelente');
UPDATE customer_reviews SET recommends = false WHERE service_rating IN ('pessimo', 'ruim');
UPDATE customer_reviews SET recommends = true WHERE recommends IS NULL;

ALTER TABLE customer_reviews ALTER COLUMN recommends SET NOT NULL;
ALTER TABLE customer_reviews DROP COLUMN service_rating;
