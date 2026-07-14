-- =============================================================================
-- SEED INICIAL — dados de desenvolvimento / homologação
-- IDs fixos para facilitar referências cruzadas e testes
-- NÃO executar em produção
-- =============================================================================

DO $$
DECLARE
  -- Categorias
  cat_tirzepatidas  UUID := 'aaaa0001-0000-0000-0000-000000000001';
  cat_retatrutidas  UUID := 'aaaa0001-0000-0000-0000-000000000002';
  cat_peptideos     UUID := 'aaaa0001-0000-0000-0000-000000000003';
  cat_perfumes      UUID := 'aaaa0001-0000-0000-0000-000000000004';
  cat_cremes        UUID := 'aaaa0001-0000-0000-0000-000000000005';
  cat_eletronicos   UUID := 'aaaa0001-0000-0000-0000-000000000006';

  -- Produtos
  prod_tirze_5mg    UUID := 'bbbb0001-0000-0000-0000-000000000001';
  prod_tirze_10mg   UUID := 'bbbb0001-0000-0000-0000-000000000002';
  prod_reta_2mg     UUID := 'bbbb0001-0000-0000-0000-000000000003';
  prod_bpc157       UUID := 'bbbb0001-0000-0000-0000-000000000004';
  prod_perfume_oud  UUID := 'bbbb0001-0000-0000-0000-000000000005';

  -- Mídias de produto
  media_tirze_1     UUID := 'cccc0001-0000-0000-0000-000000000001';
  media_tirze_2     UUID := 'cccc0001-0000-0000-0000-000000000002';
  media_tirze10_1   UUID := 'cccc0001-0000-0000-0000-000000000003';
  media_reta_1      UUID := 'cccc0001-0000-0000-0000-000000000004';
  media_bpc_1       UUID := 'cccc0001-0000-0000-0000-000000000005';
  media_perf_1      UUID := 'cccc0001-0000-0000-0000-000000000006';

  -- Clientes
  cust_juliana      UUID := 'dddd0001-0000-0000-0000-000000000001';
  cust_ricardo      UUID := 'dddd0001-0000-0000-0000-000000000002';
  cust_amanda       UUID := 'dddd0001-0000-0000-0000-000000000003';
  cust_marcos       UUID := 'dddd0001-0000-0000-0000-000000000004';

  -- Pedidos
  ord_1             UUID := 'eeee0001-0000-0000-0000-000000000001';
  ord_2             UUID := 'eeee0001-0000-0000-0000-000000000002';
  ord_3             UUID := 'eeee0001-0000-0000-0000-000000000003';

  -- Cupons
  coup_bemvindo     UUID := 'ffff0001-0000-0000-0000-000000000001';
  coup_promo15      UUID := 'ffff0001-0000-0000-0000-000000000002';
  coup_fretegratis  UUID := 'ffff0001-0000-0000-0000-000000000003';
  coup_desconto50   UUID := 'ffff0001-0000-0000-0000-000000000004';
  coup_juliana      UUID := 'ffff0001-0000-0000-0000-000000000005';
  coup_blackfriday  UUID := 'ffff0001-0000-0000-0000-000000000006';

  -- Segmentos (buscados por nome)
  seg_vip_id        UUID;
  seg_recorrente_id UUID;

BEGIN

-- =============================================================================
-- CATEGORIAS
-- =============================================================================

INSERT INTO categories (id, name, slug, short_description, full_description, icon, image_url, gradient, color_accent, display_order, is_active, is_featured_home) VALUES
  (cat_tirzepatidas, 'Tirzepatidas', 'tirzepatidas',
   'Peptídeos de última geração para controle metabólico avançado.',
   'As Tirzepatidas representam o avanço mais recente em peptídeos de controle metabólico. Atuam em múltiplos receptores para resultados superiores em saúde e composição corporal.',
   'Flask', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600',
   'from-violet-900 via-purple-800 to-indigo-900', '#8b5cf6', 1, TRUE, TRUE),

  (cat_retatrutidas, 'Retatrutidas', 'retatrutidas',
   'Tripeptídeos de alta eficiência para resultados consistentes.',
   'As Retatrutidas são peptídeos triplos de ação prolongada, desenvolvidos para oferecer resultados superiores em bem-estar e composição corporal.',
   'Zap', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600',
   'from-emerald-900 via-teal-800 to-green-900', '#10b981', 2, TRUE, TRUE),

  (cat_peptideos, 'Peptídeos', 'peptideos',
   'Linha completa de peptídeos para saúde e performance.',
   'Nossa linha de Peptídeos reúne os compostos mais estudados da ciência moderna, com alta pureza e eficácia comprovada.',
   'Dna', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600',
   'from-amber-900 via-orange-800 to-yellow-900', '#f59e0b', 3, TRUE, TRUE),

  (cat_perfumes, 'Perfumes', 'perfumes',
   'Fragrâncias exclusivas de alto padrão e longa duração.',
   'Seleção premium de perfumes importados e nacionais com composições únicas e durabilidade excepcional.',
   'Sparkles', 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600',
   'from-pink-900 via-rose-800 to-red-900', '#f43f5e', 4, TRUE, TRUE),

  (cat_cremes, 'Cremes', 'cremes',
   'Cosméticos e cremes dermatológicos de formulação avançada.',
   'Linha de cremes e cosméticos com ingredientes ativos de alta concentração para resultados visíveis.',
   'Heart', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
   'from-stone-800 via-neutral-700 to-zinc-800', '#a8a29e', 5, TRUE, FALSE),

  (cat_eletronicos, 'Eletrônicos', 'eletronicos',
   'Aparelhos e dispositivos de bem-estar e monitoramento.',
   'Tecnologia aplicada ao bem-estar: dispositivos de monitoramento, aplicadores e equipamentos de uso pessoal.',
   'Cpu', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
   'from-blue-900 via-cyan-800 to-sky-900', '#0ea5e9', 6, TRUE, FALSE)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PRODUTOS
-- =============================================================================

INSERT INTO products (
  id, name, slug, sku, category_id,
  price_pix, price_card, price_promotional, promotional_active,
  is_active, is_featured,
  short_description, description, benefits, specifications, warnings,
  stock, stock_minimum, availability,
  weight_kg, height_cm, width_cm, length_cm,
  compliance_type, requires_validation,
  allow_direct_buy, allow_whatsapp
) VALUES

  -- Tirzepatida 5mg
  (prod_tirze_5mg, 'Tirzepatida 5mg — Caneta Injetável', 'tirzepatida-5mg-caneta', 'TRZ-5MG-001', cat_tirzepatidas,
   489.90, 514.90, NULL, FALSE,
   TRUE, TRUE,
   'Caneta injetável com Tirzepatida 5mg. Ação dupla GIP/GLP-1 para controle metabólico superior.',
   'A Tirzepatida 5mg é um peptídeo de ação dupla que atua nos receptores GIP e GLP-1 simultaneamente, oferecendo resultados superiores em comparação com monoterapias convencionais.',
   'Ação dupla GIP/GLP-1\nControle glicêmico superior\nFormulação de alta pureza\nDosagem precisa',
   '[{"label":"Composição","value":"Tirzepatida 5mg"},{"label":"Volume","value":"1,5 mL"},{"label":"Aplicações","value":"6 doses de 0,25mL"},{"label":"Conservação","value":"Refrigerado 2–8°C"},{"label":"Validade","value":"12 meses"}]'::jsonb,
   'Produto regulado. Necessita de avaliação médica.',
   24, 5, 'in_stock',
   0.15, 14, 3, 3,
   'regulated', TRUE,
   TRUE, TRUE),

  -- Tirzepatida 10mg
  (prod_tirze_10mg, 'Tirzepatida 10mg — Premium', 'tirzepatida-10mg-premium', 'TRZ-10MG-002', cat_tirzepatidas,
   649.90, 682.90, 589.90, TRUE,
   TRUE, TRUE,
   'Dose avançada de Tirzepatida 10mg para resultados intensificados.',
   'Versão Premium da Tirzepatida em dose 10mg para pacientes que já completaram o período de adaptação. Fórmula de alta pureza com excipientes farmacêuticos.',
   'Dose otimizada\nEfeito ampliado\nAlta pureza\nControle de dosagem',
   '[{"label":"Composição","value":"Tirzepatida 10mg"},{"label":"Volume","value":"1,5 mL"},{"label":"Aplicações","value":"6 doses"},{"label":"Conservação","value":"Refrigerado 2–8°C"}]'::jsonb,
   'Produto regulado. Uso sob orientação médica.',
   18, 5, 'in_stock',
   0.15, 14, 3, 3,
   'regulated', TRUE,
   TRUE, TRUE),

  -- Retatrutida 2mg
  (prod_reta_2mg, 'Retatrutida 2mg — Starter Kit', 'retatrutida-2mg-starter', 'RET-2MG-001', cat_retatrutidas,
   579.90, 609.90, NULL, FALSE,
   TRUE, TRUE,
   'Kit inicial de Retatrutida 2mg para introdução ao protocolo triplo.',
   'A Retatrutida é o primeiro peptídeo triplo aprovado, atuando nos receptores GIP, GLP-1 e glucagon. Ideal para início de protocolo com dose de 2mg semanal.',
   'Ação tripla única\nDose de introdução\nFormulação premium\nResultados consistentes',
   '[{"label":"Composição","value":"Retatrutida 2mg"},{"label":"Volume","value":"1,0 mL"},{"label":"Frequência","value":"1x por semana"},{"label":"Conservação","value":"Refrigerado 2–8°C"}]'::jsonb,
   'Produto de uso exclusivo sob prescrição médica.',
   12, 3, 'low_stock',
   0.12, 12, 3, 3,
   'regulated', TRUE,
   TRUE, TRUE),

  -- BPC-157
  (prod_bpc157, 'BPC-157 — 5mg Oral/Injetável', 'bpc-157-5mg', 'BPC-5MG-001', cat_peptideos,
   189.90, 199.90, NULL, FALSE,
   TRUE, FALSE,
   'BPC-157 5mg de alta pureza para recuperação e proteção tecidual.',
   'O BPC-157 (Body Protection Compound) é um pentadecapeptídeo com extensa literatura científica sobre propriedades regenerativas e neuroprotetoras. Disponível em forma oral e injetável.',
   'Recuperação acelerada\nProteção gástrica\nAção neuroprotetora\nFlexibilidade de uso',
   '[{"label":"Composição","value":"BPC-157 5mg"},{"label":"Pureza","value":">98%"},{"label":"Apresentação","value":"Pó liofilizado"},{"label":"Uso","value":"Oral ou subcutâneo"}]'::jsonb,
   NULL,
   45, 10, 'in_stock',
   0.05, 8, 4, 4,
   'requires_validation', TRUE,
   TRUE, TRUE),

  -- Perfume Oud Premium
  (prod_perfume_oud, 'Oud Royale — Eau de Parfum 100ml', 'oud-royale-edp-100ml', 'PERF-OUD-001', cat_perfumes,
   349.90, 367.90, NULL, FALSE,
   TRUE, FALSE,
   'Fragrância oriental premium com base em Oud legítimo e notas amadeiradas.',
   'Oud Royale é uma composição olfativa de alta complexidade, inspirada nas mais requintadas fragrâncias do Oriente Médio. Combina Oud legítimo, âmbar, sândalo e especiarias raras para uma experiência única.',
   'Oud autêntico importado\nFixação superior a 12h\nProjeção intensa\nFrasco premium artesanal',
   '[{"label":"Concentração","value":"Eau de Parfum"},{"label":"Volume","value":"100ml"},{"label":"Família","value":"Oriental amadeirado"},{"label":"Notas de base","value":"Oud, âmbar, sândalo"}]'::jsonb,
   NULL,
   30, 5, 'in_stock',
   0.35, 15, 7, 7,
   'common', FALSE,
   TRUE, TRUE)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MÍDIAS DOS PRODUTOS
-- =============================================================================

INSERT INTO product_media (id, product_id, type, url, alt_text, display_order, is_main) VALUES
  (media_tirze_1,  prod_tirze_5mg,   'image', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', 'Tirzepatida 5mg caneta injetável',  1, TRUE),
  (media_tirze_2,  prod_tirze_5mg,   'image', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800', 'Detalhe da caneta Tirzepatida 5mg', 2, FALSE),
  (media_tirze10_1,prod_tirze_10mg,  'image', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', 'Tirzepatida 10mg Premium',          1, TRUE),
  (media_reta_1,   prod_reta_2mg,    'image', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800', 'Retatrutida 2mg Starter Kit',        1, TRUE),
  (media_bpc_1,    prod_bpc157,      'image', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 'BPC-157 5mg frasco liofilizado',     1, TRUE),
  (media_perf_1,   prod_perfume_oud, 'image', 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800', 'Oud Royale Eau de Parfum 100ml',     1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CLIENTES
-- =============================================================================

INSERT INTO customers (
  id, name, email, phone, cpf_cnpj,
  street, number, complement, neighborhood, city, state, zip_code,
  is_vip, vip_marked_at,
  total_orders, total_spent, average_ticket, first_order_at, last_order_at,
  created_at, updated_at
) VALUES

  (cust_juliana, 'Juliana Ferreira', 'juliana.ferreira@email.com', '(11) 98765-4321', NULL,
   'Rua das Flores', '142', 'Apto 32', 'Jardim América', 'São Paulo', 'SP', '01410-000',
   TRUE, '2025-01-15T10:00:00Z',
   9, 4289.90, 476.65, '2024-01-20T10:00:00Z', '2025-06-12T10:00:00Z',
   '2024-01-20T10:00:00Z', '2025-06-12T10:00:00Z'),

  (cust_ricardo, 'Ricardo Mendes', 'ricardo.mendes@email.com', '(21) 97654-3210', NULL,
   'Av. Atlântica', '2000', 'Sala 402', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070-010',
   TRUE, '2025-02-01T10:00:00Z',
   7, 3150.80, 450.11, '2024-03-05T10:00:00Z', '2025-06-10T10:00:00Z',
   '2024-03-05T10:00:00Z', '2025-06-10T10:00:00Z'),

  (cust_amanda, 'Amanda Costa', 'amanda.costa@email.com', '(31) 96543-2109', NULL,
   'Rua Pernambuco', '450', NULL, 'Funcionários', 'Belo Horizonte', 'MG', '30130-150',
   FALSE, NULL,
   3, 1047.70, 349.23, '2025-01-10T10:00:00Z', '2025-05-28T10:00:00Z',
   '2025-01-10T10:00:00Z', '2025-05-28T10:00:00Z'),

  (cust_marcos, 'Marcos Oliveira', 'marcos.oliveira@email.com', '(51) 95432-1098', NULL,
   'Av. Ipiranga', '6681', 'Bloco B', 'Partenon', 'Porto Alegre', 'RS', '90619-900',
   FALSE, NULL,
   1, 189.90, 189.90, '2025-06-13T10:00:00Z', '2025-06-13T10:00:00Z',
   '2025-06-13T10:00:00Z', '2025-06-13T10:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Notas dos clientes
-- ---------------------------------------------------------------------------

INSERT INTO customer_notes (id, customer_id, note, created_by, created_at) VALUES
  ('aa010001-0000-0000-0000-000000000001', cust_juliana,
   'Prefere receber às terças e quintas. Sempre faz pedidos de alto valor.',
   'admin', '2025-03-10T10:00:00Z'),
  ('aa010001-0000-0000-0000-000000000002', cust_juliana,
   'Solicitou cupom exclusivo para próxima compra — enviado em 10/06.',
   'admin', '2025-06-10T10:00:00Z'),
  ('aa010001-0000-0000-0000-000000000003', cust_ricardo,
   'Cliente VIP — prioridade no atendimento. Prefere contato via WhatsApp.',
   'admin', '2025-02-01T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Memberships de segmento
-- ---------------------------------------------------------------------------

SELECT id INTO seg_vip_id FROM customer_segments WHERE name = 'VIP' LIMIT 1;
SELECT id INTO seg_recorrente_id FROM customer_segments WHERE name = 'Recorrente' LIMIT 1;

IF seg_vip_id IS NOT NULL AND seg_recorrente_id IS NOT NULL THEN
  INSERT INTO customer_segment_memberships (customer_id, segment_id) VALUES
    (cust_juliana, seg_vip_id),
    (cust_ricardo, seg_vip_id),
    (cust_amanda,  seg_recorrente_id)
  ON CONFLICT DO NOTHING;
END IF;

-- =============================================================================
-- CUPONS
-- =============================================================================

INSERT INTO coupons (
  id, code, description_internal, type, value, is_active,
  start_date, expiration_date, max_uses_total, max_uses_per_customer, min_order_value,
  customer_specific_id, customer_specific_name, uses_count
) VALUES

  (coup_bemvindo, 'BEMVINDO10', 'Cupom de boas-vindas para novos clientes — 10% off',
   'percentage', 10, TRUE,
   '2025-01-01', '2025-12-31', 500, 1, 200.00,
   NULL, NULL, 87),

  (coup_promo15, 'PROMO15', 'Promoção junho — 15% em peptídeos',
   'percentage', 15, TRUE,
   '2025-06-01', '2025-06-30', 100, 2, 400.00,
   NULL, NULL, 23),

  (coup_fretegratis, 'FRETEGRATIS', 'Frete grátis sem valor mínimo',
   'free_shipping', 0, TRUE,
   NULL, '2025-07-31', NULL, 1, NULL,
   NULL, NULL, 41),

  (coup_desconto50, 'DESCONTO50', 'R$50 de desconto em pedidos acima de R$500',
   'fixed', 50, TRUE,
   NULL, '2025-08-31', NULL, NULL, 500.00,
   NULL, NULL, 15),

  (coup_juliana, 'JULIANA10', 'Cupom exclusivo para Juliana Ferreira — cliente VIP',
   'percentage', 10, TRUE,
   NULL, '2025-07-14', 3, 3, NULL,
   cust_juliana, 'Juliana Ferreira', 1),

  (coup_blackfriday, 'BLACKFRIDAY2024', 'Black Friday 2024 — 20% em tudo',
   'percentage', 20, FALSE,
   '2024-11-29', '2024-11-30', 1000, NULL, NULL,
   NULL, NULL, 234)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PEDIDOS
-- =============================================================================

INSERT INTO orders (
  id, order_number, customer_id, customer_name, customer_phone, customer_email,
  status, payment_status, payment_method, payment_id,
  shipping_street, shipping_number, shipping_complement, shipping_neighborhood,
  shipping_city, shipping_state, shipping_zip_code,
  subtotal, coupon_code, coupon_discount, shipping_value, shipping_service, total,
  created_at, updated_at
) VALUES

  (ord_1, 'ORD-20250614-0001', cust_juliana, 'Juliana Ferreira', '(11) 98765-4321', 'juliana.ferreira@email.com',
   'awaiting_separation', 'confirmed', 'pix', 'mp-pay-001',
   'Rua das Flores', '142', 'Apto 32', 'Jardim América', 'São Paulo', 'SP', '01410-000',
   489.90, 'JULIANA10', 48.99, 28.90, 'SEDEX', 469.81,
   '2025-06-14T09:15:00Z', '2025-06-14T10:00:00Z'),

  (ord_2, 'ORD-20250614-0002', cust_ricardo, 'Ricardo Mendes', '(21) 97654-3210', 'ricardo.mendes@email.com',
   'pending_payment', 'pending', 'pix', NULL,
   'Av. Atlântica', '2000', 'Sala 402', 'Copacabana', 'Rio de Janeiro', 'RJ', '22070-010',
   649.90, NULL, 0, 35.50, 'SEDEX', 685.40,
   '2025-06-14T11:20:00Z', '2025-06-14T11:20:00Z'),

  (ord_3, 'ORD-20250613-0003', cust_amanda, 'Amanda Costa', '(31) 96543-2109', 'amanda.costa@email.com',
   'delivered', 'confirmed', 'pix', 'mp-pay-003',
   'Rua Pernambuco', '450', NULL, 'Funcionários', 'Belo Horizonte', 'MG', '30130-150',
   189.90, 'BEMVINDO10', 18.99, 0, 'PAC', 170.91,
   '2025-06-13T15:30:00Z', '2025-06-14T08:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Itens dos pedidos
-- ---------------------------------------------------------------------------

INSERT INTO order_items (
  id, order_id, product_id,
  product_name, product_sku, product_image,
  quantity, unit_price_pix, unit_price_card, subtotal
) VALUES

  ('aa020001-0000-0000-0000-000000000001', ord_1, prod_tirze_5mg,
   'Tirzepatida 5mg — Caneta Injetável', 'TRZ-5MG-001',
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200',
   1, 489.90, 514.90, 489.90),

  ('aa020001-0000-0000-0000-000000000002', ord_2, prod_tirze_10mg,
   'Tirzepatida 10mg — Premium', 'TRZ-10MG-002',
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200',
   1, 649.90, 682.90, 649.90),

  ('aa020001-0000-0000-0000-000000000003', ord_3, prod_bpc157,
   'BPC-157 — 5mg Oral/Injetável', 'BPC-5MG-001',
   'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200',
   1, 189.90, 199.90, 189.90)

ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Histórico de status dos pedidos
-- ---------------------------------------------------------------------------

INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by, created_at) VALUES
  ('aa030001-0000-0000-0000-000000000001', ord_1, NULL,                  'pending_payment',      'system', '2025-06-14T09:15:00Z'),
  ('aa030001-0000-0000-0000-000000000002', ord_1, 'pending_payment',     'payment_confirmed',    'system', '2025-06-14T09:18:00Z'),
  ('aa030001-0000-0000-0000-000000000003', ord_1, 'payment_confirmed',   'awaiting_separation',  'admin',  '2025-06-14T10:00:00Z'),
  ('aa030001-0000-0000-0000-000000000004', ord_2, NULL,                  'pending_payment',      'system', '2025-06-14T11:20:00Z'),
  ('aa030001-0000-0000-0000-000000000005', ord_3, NULL,                  'pending_payment',      'system', '2025-06-13T15:30:00Z'),
  ('aa030001-0000-0000-0000-000000000006', ord_3, 'pending_payment',     'payment_confirmed',    'system', '2025-06-13T15:33:00Z'),
  ('aa030001-0000-0000-0000-000000000007', ord_3, 'payment_confirmed',   'awaiting_separation',  'admin',  '2025-06-13T16:00:00Z'),
  ('aa030001-0000-0000-0000-000000000008', ord_3, 'awaiting_separation', 'shipped',              'admin',  '2025-06-13T18:00:00Z'),
  ('aa030001-0000-0000-0000-000000000009', ord_3, 'shipped',             'delivered',            'system', '2025-06-14T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Pagamentos (apenas para pedidos com payment_status = confirmed)
-- ---------------------------------------------------------------------------

INSERT INTO payments (
  id, order_id, method, status, amount, external_id, paid_at
) VALUES
  ('aa040001-0000-0000-0000-000000000001', ord_1, 'pix', 'confirmed', 469.81, 'mp-pay-001', '2025-06-14T09:18:00Z'),
  ('aa040001-0000-0000-0000-000000000002', ord_3, 'pix', 'confirmed', 170.91, 'mp-pay-003', '2025-06-13T15:33:00Z')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Usos de cupom
-- ---------------------------------------------------------------------------

INSERT INTO coupon_usages (id, coupon_id, order_id, customer_email, discount_applied, created_at) VALUES
  ('aa050001-0000-0000-0000-000000000001', coup_juliana,  ord_1, 'juliana.ferreira@email.com', 48.99, '2025-06-14T09:15:00Z'),
  ('aa050001-0000-0000-0000-000000000002', coup_bemvindo, ord_3, 'amanda.costa@email.com',     18.99, '2025-06-13T15:30:00Z')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- NOTIFICAÇÕES INICIAIS (exemplos para o painel)
-- =============================================================================

INSERT INTO notifications (id, type, title, body, data, is_read, created_at) VALUES
  ('aa060001-0000-0000-0000-000000000001',
   'new_order', 'Novo pedido recebido',
   'Pedido ORD-20250614-0001 de Juliana Ferreira — R$ 469,81',
   '{"order_id":"eeee0001-0000-0000-0000-000000000001","order_number":"ORD-20250614-0001"}'::jsonb,
   TRUE, '2025-06-14T09:15:00Z'),

  ('aa060001-0000-0000-0000-000000000002',
   'payment_confirmed', 'Pagamento confirmado',
   'Pedido ORD-20250614-0001 de Juliana Ferreira teve o Pix confirmado.',
   '{"order_id":"eeee0001-0000-0000-0000-000000000001"}'::jsonb,
   TRUE, '2025-06-14T09:18:00Z'),

  ('aa060001-0000-0000-0000-000000000003',
   'new_order', 'Novo pedido recebido',
   'Pedido ORD-20250614-0002 de Ricardo Mendes — R$ 685,40',
   '{"order_id":"eeee0001-0000-0000-0000-000000000002","order_number":"ORD-20250614-0002"}'::jsonb,
   FALSE, '2025-06-14T11:20:00Z'),

  ('aa060001-0000-0000-0000-000000000004',
   'stock_alert', 'Estoque baixo',
   'Produto "Retatrutida 2mg — Starter Kit" com 12 unidades (mínimo: 3)',
   '{"product_id":"bbbb0001-0000-0000-0000-000000000003","stock":12}'::jsonb,
   FALSE, '2025-06-14T09:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CORREÇÃO DE MÉTRICAS DOS CLIENTES
-- trg_update_customer_metrics dispara no INSERT de orders e recalcula apenas
-- os pedidos confirmados do seed (1 por cliente), sobrescrevendo os valores
-- históricos seeded. As UPDATEs abaixo restauram o estado demo pretendido.
-- =============================================================================

UPDATE customers SET
  total_orders   = 9,
  total_spent    = 4289.90,
  average_ticket = 476.65,
  first_order_at = '2024-01-20T10:00:00Z',
  last_order_at  = '2025-06-12T10:00:00Z'
WHERE id = cust_juliana;

UPDATE customers SET
  total_orders   = 7,
  total_spent    = 3150.80,
  average_ticket = 450.11,
  first_order_at = '2024-03-05T10:00:00Z',
  last_order_at  = '2025-06-10T10:00:00Z'
WHERE id = cust_ricardo;

UPDATE customers SET
  total_orders   = 3,
  total_spent    = 1047.70,
  average_ticket = 349.23,
  first_order_at = '2025-01-10T10:00:00Z',
  last_order_at  = '2025-05-28T10:00:00Z'
WHERE id = cust_amanda;

END $$;
