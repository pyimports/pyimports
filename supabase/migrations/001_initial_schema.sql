-- =============================================================================
-- MIGRAÇÃO 001 — Schema inicial do e-commerce premium
-- Gerado em: 2026-06-14
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- busca por similaridade textual

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE product_availability AS ENUM (
  'in_stock',
  'low_stock',
  'out_of_stock',
  'on_consultation'
);

CREATE TYPE compliance_type AS ENUM (
  'common',
  'regulated',
  'requires_validation',
  'on_consultation'
);

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'payment_confirmed',
  'awaiting_validation',
  'awaiting_separation',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'confirmed',
  'failed',
  'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'pix',
  'card'
);

CREATE TYPE coupon_type AS ENUM (
  'percentage',
  'fixed',
  'free_shipping'
);

CREATE TYPE admin_role AS ENUM (
  'owner',
  'manager'
);

CREATE TYPE media_type AS ENUM (
  'image',
  'video'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'status_change',
  'login',
  'logout'
);

CREATE TYPE inventory_movement_type AS ENUM (
  'sale',
  'restock',
  'adjustment',
  'cancelled_return'
);

-- ---------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR: atualiza updated_at automaticamente
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR: gera número do pedido
-- Formato: ORD-YYYYMMDD-NNNN (ex: ORD-20250614-0001)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- TABELA: admin_profiles
-- Ligada à tabela auth.users do Supabase Auth via id (UUID)
-- Criada ANTES de is_admin() — função LANGUAGE sql valida o corpo na criação
-- ---------------------------------------------------------------------------

CREATE TABLE admin_profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  role          admin_role  NOT NULL DEFAULT 'manager',
  avatar_url    TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_profiles IS 'Perfis de administradores — vinculados ao Supabase Auth';
COMMENT ON COLUMN admin_profiles.role IS 'owner: acesso total | manager: acesso operacional';

-- ---------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR: verifica se o usuário autenticado é admin
-- Usada nas políticas RLS das tabelas protegidas
-- DEVE vir depois de admin_profiles — LANGUAGE sql valida o corpo ao criar
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;

-- ---------------------------------------------------------------------------
-- TABELA: categories
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  short_description TEXT        NOT NULL DEFAULT '',
  full_description  TEXT,
  icon              TEXT,
  image_url         TEXT,
  gradient          TEXT,
  color_accent      TEXT,
  display_order     INTEGER     NOT NULL DEFAULT 0,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_featured_home  BOOLEAN     NOT NULL DEFAULT FALSE,
  meta_title        TEXT,
  meta_description  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_active ON categories (is_active, display_order);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: products
-- specifications e faq armazenados como JSONB
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT                 NOT NULL,
  slug                TEXT                 NOT NULL UNIQUE,
  sku                 TEXT                 NOT NULL UNIQUE,
  category_id         UUID                 NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

  -- Preços (em reais, 2 casas decimais)
  price_pix           NUMERIC(10, 2)       NOT NULL CHECK (price_pix >= 0),
  price_card          NUMERIC(10, 2)       NOT NULL CHECK (price_card >= 0),
  price_promotional   NUMERIC(10, 2)       CHECK (price_promotional >= 0),
  promotional_active  BOOLEAN              NOT NULL DEFAULT FALSE,
  cost_price          NUMERIC(10, 2)       CHECK (cost_price >= 0),

  -- Visibilidade
  is_active           BOOLEAN              NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN              NOT NULL DEFAULT FALSE,

  -- Textos
  short_description   TEXT                 NOT NULL DEFAULT '',
  description         TEXT                 NOT NULL DEFAULT '',
  benefits            TEXT,
  specifications      JSONB,   -- [{label: string, value: string}]
  faq                 JSONB,   -- [{question: string, answer: string}]
  warnings            TEXT,

  -- Estoque
  stock               INTEGER              NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimum       INTEGER              NOT NULL DEFAULT 0 CHECK (stock_minimum >= 0),
  availability        product_availability NOT NULL DEFAULT 'in_stock',

  -- Dimensões / logística
  weight_kg           NUMERIC(8, 3)        NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  height_cm           NUMERIC(8, 2)        NOT NULL DEFAULT 0,
  width_cm            NUMERIC(8, 2)        NOT NULL DEFAULT 0,
  length_cm           NUMERIC(8, 2)        NOT NULL DEFAULT 0,
  extra_handling_days INTEGER              NOT NULL DEFAULT 0,

  -- Conformidade / compliance
  compliance_type     compliance_type      NOT NULL DEFAULT 'common',
  requires_validation BOOLEAN              NOT NULL DEFAULT FALSE,

  -- Comportamento de compra
  allow_direct_buy    BOOLEAN              NOT NULL DEFAULT TRUE,
  allow_whatsapp      BOOLEAN              NOT NULL DEFAULT TRUE,

  -- SEO
  meta_title          TEXT,
  meta_description    TEXT,

  -- Notas internas (não visíveis ao cliente)
  internal_notes      TEXT,

  created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products (slug);
CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category ON products (category_id, is_active);
CREATE INDEX idx_products_active_featured ON products (is_active, is_featured);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: product_media
-- Mídias (imagens / vídeos) associadas a um produto
-- ---------------------------------------------------------------------------

CREATE TABLE product_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type          media_type  NOT NULL DEFAULT 'image',
  url           TEXT        NOT NULL,
  thumbnail_url TEXT,
  alt_text      TEXT,
  display_order INTEGER     NOT NULL DEFAULT 1,
  is_main       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_media_product ON product_media (product_id, display_order);

-- Garante que cada produto tenha no máximo uma imagem principal
CREATE UNIQUE INDEX idx_product_media_main ON product_media (product_id)
  WHERE is_main = TRUE;

-- ---------------------------------------------------------------------------
-- TABELA: customers
-- Métricas desnormalizadas mantidas por trigger (total_orders, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  phone           TEXT        NOT NULL,
  cpf_cnpj        TEXT,

  -- Endereço principal
  street          TEXT        NOT NULL DEFAULT '',
  number          TEXT        NOT NULL DEFAULT '',
  complement      TEXT,
  neighborhood    TEXT        NOT NULL DEFAULT '',
  city            TEXT        NOT NULL DEFAULT '',
  state           CHAR(2)     NOT NULL DEFAULT '',
  zip_code        TEXT        NOT NULL DEFAULT '',

  -- Segmentação
  is_vip          BOOLEAN     NOT NULL DEFAULT FALSE,
  vip_marked_at   TIMESTAMPTZ,

  -- Métricas desnormalizadas (atualizadas via trigger em orders)
  total_orders    INTEGER     NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  average_ticket  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  first_order_at  TIMESTAMPTZ,
  last_order_at   TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_vip ON customers (is_vip);
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: customer_notes
-- Notas internas sobre o cliente, feitas por admins
-- ---------------------------------------------------------------------------

CREATE TABLE customer_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note        TEXT        NOT NULL,
  created_by  TEXT        NOT NULL, -- e-mail do admin ou 'system'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes (customer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABELA: customer_segments
-- Segmentos para agrupamento de clientes (ex: "VIP", "Inativo", "Recorrente")
-- ---------------------------------------------------------------------------

CREATE TABLE customer_segments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de junção: cliente <-> segmento (M2M)
CREATE TABLE customer_segment_memberships (
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_id  UUID        NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, segment_id)
);

-- ---------------------------------------------------------------------------
-- TABELA: orders
-- Dados do cliente são desnormalizados (snapshot no momento da compra)
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT           NOT NULL UNIQUE DEFAULT generate_order_number(),
  customer_id           UUID           REFERENCES customers(id) ON DELETE SET NULL,

  -- Snapshot do cliente no momento da compra
  customer_name         TEXT           NOT NULL,
  customer_phone        TEXT           NOT NULL,
  customer_email        TEXT           NOT NULL,

  status                order_status   NOT NULL DEFAULT 'pending_payment',
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  payment_method        payment_method NOT NULL,
  payment_id            TEXT,          -- ID externo (Mercado Pago)

  -- Endereço de entrega (snapshot)
  shipping_street       TEXT           NOT NULL,
  shipping_number       TEXT           NOT NULL,
  shipping_complement   TEXT,
  shipping_neighborhood TEXT           NOT NULL,
  shipping_city         TEXT           NOT NULL,
  shipping_state        CHAR(2)        NOT NULL,
  shipping_zip_code     TEXT           NOT NULL,

  -- Financeiro
  subtotal              NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  coupon_code           TEXT,
  coupon_discount       NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0),
  shipping_value        NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_value >= 0),
  shipping_service      TEXT,
  total                 NUMERIC(12, 2) NOT NULL CHECK (total >= 0),

  notes                 TEXT,
  internal_notes        TEXT,

  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders (customer_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);
CREATE INDEX idx_orders_number ON orders (order_number);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
CREATE INDEX idx_orders_payment_id ON orders (payment_id) WHERE payment_id IS NOT NULL;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: order_items
-- Dados do produto são desnormalizados (snapshot do catálogo na compra)
-- ---------------------------------------------------------------------------

CREATE TABLE order_items (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID           REFERENCES products(id) ON DELETE SET NULL,

  -- Snapshot do produto no momento da compra
  product_name    TEXT           NOT NULL,
  product_sku     TEXT           NOT NULL,
  product_image   TEXT,

  quantity        INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price_pix  NUMERIC(10, 2) NOT NULL CHECK (unit_price_pix >= 0),
  unit_price_card NUMERIC(10, 2) NOT NULL CHECK (unit_price_card >= 0),
  subtotal        NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- TABELA: payments
-- Detalhes do pagamento (Pix, cartão) — dados da gateway na Fase 2
-- ---------------------------------------------------------------------------

CREATE TABLE payments (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),

  -- Dados Pix
  pix_code        TEXT,          -- código copia-e-cola
  pix_qr_url      TEXT,          -- URL do QR code
  pix_expiration  TIMESTAMPTZ,

  -- Dados cartão / gateway
  external_id     TEXT,          -- ID na Mercado Pago
  installments    INTEGER,       -- parcelas (se cartão)
  paid_at         TIMESTAMPTZ,

  -- Payload bruto da gateway (para auditoria)
  metadata        JSONB,

  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_external ON payments (external_id) WHERE external_id IS NOT NULL;

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: payment_webhooks
-- Registra notificações recebidas da Mercado Pago (Fase 2)
-- ---------------------------------------------------------------------------

CREATE TABLE payment_webhooks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT        NOT NULL,  -- ID da notificação na MP
  type          TEXT        NOT NULL,  -- ex: 'payment'
  action        TEXT        NOT NULL,  -- ex: 'payment.created', 'payment.updated'
  raw_payload   JSONB       NOT NULL,
  processed     BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Garante idempotência: o mesmo evento nunca é inserido duas vezes
  UNIQUE (external_id, action)
);

CREATE INDEX idx_webhooks_external ON payment_webhooks (external_id);
CREATE INDEX idx_webhooks_processed ON payment_webhooks (processed, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABELA: order_status_history
-- Auditoria de mudanças de status do pedido
-- ---------------------------------------------------------------------------

CREATE TABLE order_status_history (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status  order_status,
  new_status       order_status NOT NULL,
  changed_by       TEXT         NOT NULL, -- 'system', 'webhook', ou e-mail do admin
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history (order_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- TABELA: coupons
-- restricted_categories/products: arrays de UUIDs (null = sem restrição)
-- ---------------------------------------------------------------------------

CREATE TABLE coupons (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   TEXT           NOT NULL UNIQUE,
  description_internal   TEXT,
  type                   coupon_type    NOT NULL,
  value                  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  is_active              BOOLEAN        NOT NULL DEFAULT TRUE,
  start_date             DATE,
  expiration_date        DATE,
  max_uses_total         INTEGER        CHECK (max_uses_total > 0),
  max_uses_per_customer  INTEGER        CHECK (max_uses_per_customer > 0),
  min_order_value        NUMERIC(10, 2) CHECK (min_order_value >= 0),

  -- Cupom exclusivo para um cliente específico
  customer_specific_id   UUID           REFERENCES customers(id) ON DELETE SET NULL,
  customer_specific_name TEXT,          -- desnormalizado para exibição

  -- Restrições de categoria/produto (null = sem restrição = vale em tudo)
  restricted_categories  UUID[],
  restricted_products    UUID[],

  -- Contador de usos (desnormalizado, mantido por trigger)
  uses_count             INTEGER        NOT NULL DEFAULT 0,

  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons (code);
CREATE INDEX idx_coupons_active ON coupons (is_active);
CREATE INDEX idx_coupons_customer ON coupons (customer_specific_id) WHERE customer_specific_id IS NOT NULL;

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TABELA: coupon_usages
-- Registra cada utilização de cupom em um pedido
-- ---------------------------------------------------------------------------

CREATE TABLE coupon_usages (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id        UUID           NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email   TEXT           NOT NULL,
  discount_applied NUMERIC(10, 2) NOT NULL CHECK (discount_applied >= 0),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX idx_coupon_usages_order ON coupon_usages (order_id);
CREATE INDEX idx_coupon_usages_email ON coupon_usages (customer_email);

-- ---------------------------------------------------------------------------
-- TABELA: shipping_quotes
-- Cache de cotações de frete (evita chamadas redundantes à API)
-- ---------------------------------------------------------------------------

CREATE TABLE shipping_quotes (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  cep_origin       TEXT           NOT NULL,
  cep_destination  TEXT           NOT NULL,
  weight_kg        NUMERIC(8, 3)  NOT NULL,
  height_cm        NUMERIC(8, 2)  NOT NULL,
  width_cm         NUMERIC(8, 2)  NOT NULL,
  length_cm        NUMERIC(8, 2)  NOT NULL,
  options          JSONB          NOT NULL,  -- [{code, name, carrier, price, delivery_days}]
  quoted_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ    NOT NULL   -- expiração do cache
);

CREATE INDEX idx_shipping_quotes_ceps ON shipping_quotes (cep_origin, cep_destination, expires_at);

-- ---------------------------------------------------------------------------
-- TABELA: shipping_methods
-- Configuração das transportadoras ativas
-- ---------------------------------------------------------------------------

CREATE TABLE shipping_methods (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT        NOT NULL UNIQUE,
  name           TEXT        NOT NULL,
  carrier        TEXT        NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  max_weight_kg  NUMERIC(8, 3),
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABELA: store_settings_public
-- Configurações visíveis ao público (nome, logo, whatsapp, etc.)
-- Padrão de uma única linha: lock BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (lock)
-- ---------------------------------------------------------------------------

CREATE TABLE store_settings_public (
  lock             BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (lock),
  store_name       TEXT        NOT NULL DEFAULT 'Premium Store',
  logo_url         TEXT,
  slogan           TEXT,
  primary_color    TEXT        NOT NULL DEFAULT '#c9a84c',
  whatsapp_number  TEXT        NOT NULL DEFAULT '',
  email            TEXT,
  address          TEXT,
  meta_title       TEXT,
  meta_description TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABELA: store_settings_private
-- Configurações sensíveis (chaves de API, modo manutenção, etc.)
-- ACESSO EXCLUSIVO VIA SERVICE ROLE — nunca expor ao cliente
-- ---------------------------------------------------------------------------

CREATE TABLE store_settings_private (
  lock                     BOOLEAN NOT NULL PRIMARY KEY DEFAULT TRUE CHECK (lock),
  pix_key                  TEXT,
  pix_beneficiary_name     TEXT,
  cep_origin               TEXT,
  melhor_envio_token       TEXT,   -- API de frete (Fase 3)
  mercado_pago_public_key  TEXT,   -- chave pública MP (pode ir ao cliente)
  mercado_pago_secret_key  TEXT,   -- NUNCA expor — somente service role
  maintenance_mode         BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN store_settings_private.mercado_pago_secret_key IS
  'SEGREDO — nunca retornar em queries do cliente. Usar apenas via service role no servidor.';

-- ---------------------------------------------------------------------------
-- TABELA: audit_logs
-- Registro de ações administrativas para rastreabilidade
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID         REFERENCES admin_profiles(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  table_name  TEXT         NOT NULL,
  record_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs (admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- TABELA: inventory_movements
-- Rastreia todas as movimentações de estoque
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_movements (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID                   NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type             inventory_movement_type NOT NULL,
  quantity_change  INTEGER                NOT NULL,  -- negativo = saída, positivo = entrada
  quantity_before  INTEGER                NOT NULL,
  quantity_after   INTEGER                NOT NULL,
  order_id         UUID                   REFERENCES orders(id) ON DELETE SET NULL,
  notes            TEXT,
  created_by       TEXT                   NOT NULL DEFAULT 'system',
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory_movements (product_id, created_at DESC);
CREATE INDEX idx_inventory_order ON inventory_movements (order_id) WHERE order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- TABELA: notifications
-- Notificações internas para o painel admin
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,  -- 'new_order', 'payment_confirmed', 'stock_alert', 'validation_required'
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB,                 -- dados extras: {order_id, product_id, ...}
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications (is_read, created_at DESC) WHERE is_read = FALSE;

-- =============================================================================
-- TRIGGERS DE NEGÓCIO
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: atualiza métricas do cliente quando um pedido é inserido/atualizado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
DECLARE
  target_customer_id UUID;
BEGIN
  -- Determina qual customer_id foi afetado
  IF TG_OP = 'DELETE' THEN
    target_customer_id := OLD.customer_id;
  ELSE
    target_customer_id := NEW.customer_id;
  END IF;

  -- Sai sem atualizar se o pedido não tem cliente vinculado
  IF target_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE customers
  SET
    total_orders   = (
      SELECT COUNT(*) FROM orders
      WHERE customer_id = target_customer_id
        AND payment_status = 'confirmed'
    ),
    total_spent    = COALESCE((
      SELECT SUM(total) FROM orders
      WHERE customer_id = target_customer_id
        AND payment_status = 'confirmed'
    ), 0),
    average_ticket = COALESCE((
      SELECT AVG(total) FROM orders
      WHERE customer_id = target_customer_id
        AND payment_status = 'confirmed'
    ), 0),
    first_order_at = (
      SELECT MIN(created_at) FROM orders
      WHERE customer_id = target_customer_id
        AND payment_status = 'confirmed'
    ),
    last_order_at  = (
      SELECT MAX(created_at) FROM orders
      WHERE customer_id = target_customer_id
        AND payment_status = 'confirmed'
    ),
    updated_at     = NOW()
  WHERE id = target_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER trg_update_customer_metrics
  AFTER INSERT OR UPDATE OF payment_status OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_metrics();

-- ---------------------------------------------------------------------------
-- Trigger: incrementa uses_count do cupom ao registrar uso
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_coupon_uses()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons
  SET uses_count = uses_count + 1,
      updated_at = NOW()
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER trg_increment_coupon_uses
  AFTER INSERT ON coupon_usages
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_uses();

-- ---------------------------------------------------------------------------
-- Trigger: registra movimentação de estoque quando pedido é confirmado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  stock_before INTEGER;
BEGIN
  -- Só age quando status muda para 'payment_confirmed'
  IF NEW.payment_status = 'confirmed' AND (OLD.payment_status IS DISTINCT FROM 'confirmed') THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      SELECT stock INTO stock_before FROM products WHERE id = item.product_id;

      UPDATE products
      SET stock = GREATEST(0, stock - item.quantity),
          updated_at = NOW()
      WHERE id = item.product_id;

      INSERT INTO inventory_movements (
        product_id, type, quantity_change,
        quantity_before, quantity_after,
        order_id, created_by
      ) VALUES (
        item.product_id,
        'sale',
        -item.quantity,
        stock_before,
        GREATEST(0, stock_before - item.quantity),
        NEW.id,
        'system'
      );
    END LOOP;
  END IF;

  -- Devolve estoque quando pedido é cancelado a partir de 'confirmed'
  IF NEW.payment_status != 'confirmed' AND OLD.payment_status = 'confirmed' AND NEW.status = 'cancelled' THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      SELECT stock INTO stock_before FROM products WHERE id = item.product_id;

      UPDATE products
      SET stock = stock + item.quantity,
          updated_at = NOW()
      WHERE id = item.product_id;

      INSERT INTO inventory_movements (
        product_id, type, quantity_change,
        quantity_before, quantity_after,
        order_id, created_by
      ) VALUES (
        item.product_id,
        'cancelled_return',
        item.quantity,
        stock_before,
        stock_before + item.quantity,
        NEW.id,
        'system'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER trg_inventory_on_order
  AFTER UPDATE OF payment_status, status ON orders
  FOR EACH ROW EXECUTE FUNCTION record_inventory_movement();

-- ---------------------------------------------------------------------------
-- Trigger: cria notificação ao inserir novo pedido
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (type, title, body, data)
  VALUES (
    'new_order',
    'Novo pedido recebido',
    'Pedido ' || NEW.order_number || ' de ' || NEW.customer_name || ' — R$ ' || NEW.total,
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();

-- ---------------------------------------------------------------------------
-- Trigger: notificação de estoque baixo ao atualizar produto
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= NEW.stock_minimum AND OLD.stock > OLD.stock_minimum THEN
    INSERT INTO notifications (type, title, body, data)
    VALUES (
      'stock_alert',
      'Estoque baixo',
      'Produto "' || NEW.name || '" com ' || NEW.stock || ' unidades (mínimo: ' || NEW.stock_minimum || ')',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name, 'stock', NEW.stock)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER trg_notify_low_stock
  AFTER UPDATE OF stock ON products
  FOR EACH ROW EXECUTE FUNCTION notify_low_stock();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE admin_profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_quotes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods              ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings_public         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings_private        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                 ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- FORCE RLS: aplica políticas mesmo ao dono da tabela (defense-in-depth)
-- Tabelas sensíveis com dados de negócio, financeiros e de acesso
-- ---------------------------------------------------------------------------

ALTER TABLE admin_profiles         FORCE ROW LEVEL SECURITY;
ALTER TABLE customers              FORCE ROW LEVEL SECURITY;
ALTER TABLE orders                 FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items            FORCE ROW LEVEL SECURITY;
ALTER TABLE payments               FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks       FORCE ROW LEVEL SECURITY;
ALTER TABLE coupons                FORCE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages          FORCE ROW LEVEL SECURITY;
ALTER TABLE store_settings_private FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements    FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- admin_profiles: cada admin lê/atualiza apenas o próprio perfil
-- Não usa is_admin() para evitar recursão
-- ---------------------------------------------------------------------------

CREATE POLICY "admin pode ler próprio perfil"
  ON admin_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "admin pode atualizar próprio perfil"
  ON admin_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- categories: leitura pública, escrita apenas para admins
-- ---------------------------------------------------------------------------

CREATE POLICY "categorias são públicas"
  ON categories FOR SELECT
  USING (TRUE);

CREATE POLICY "apenas admins gerenciam categorias"
  ON categories FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- products: produtos ativos são públicos, edição apenas para admins
-- ---------------------------------------------------------------------------

CREATE POLICY "produtos ativos são públicos"
  ON products FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "apenas admins gerenciam produtos"
  ON products FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- product_media: segue a visibilidade do produto
-- ---------------------------------------------------------------------------

CREATE POLICY "mídias de produtos ativos são públicas"
  ON product_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_media.product_id AND (p.is_active = TRUE OR is_admin())
    )
  );

CREATE POLICY "apenas admins gerenciam mídias"
  ON product_media FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- customers: sem acesso público, admins têm acesso total
-- ---------------------------------------------------------------------------

CREATE POLICY "admins gerenciam clientes"
  ON customers FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins gerenciam notas de clientes"
  ON customer_notes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins gerenciam segmentos"
  ON customer_segments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins gerenciam memberships de segmentos"
  ON customer_segment_memberships FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- orders: sem acesso público, admins têm acesso total
-- ---------------------------------------------------------------------------

CREATE POLICY "admins gerenciam pedidos"
  ON orders FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins gerenciam itens de pedidos"
  ON order_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins gerenciam pagamentos"
  ON payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins visualizam histórico de status"
  ON order_status_history FOR SELECT
  USING (is_admin());

-- payment_webhooks: exclusivo para service role (sem política = sem acesso por anon/authenticated)

-- ---------------------------------------------------------------------------
-- coupons: sem acesso público
-- ---------------------------------------------------------------------------

CREATE POLICY "admins gerenciam cupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins visualizam usos de cupons"
  ON coupon_usages FOR SELECT
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- shipping_methods: leitura pública (necessário no checkout)
-- ---------------------------------------------------------------------------

CREATE POLICY "métodos de frete são públicos"
  ON shipping_methods FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "admins gerenciam métodos de frete"
  ON shipping_methods FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- shipping_quotes: service role apenas

-- ---------------------------------------------------------------------------
-- store_settings_public: leitura pública, escrita apenas owner
-- ---------------------------------------------------------------------------

CREATE POLICY "configurações públicas são visíveis a todos"
  ON store_settings_public FOR SELECT
  USING (TRUE);

CREATE POLICY "apenas admins atualizam configurações públicas"
  ON store_settings_public FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- store_settings_private: sem política = acesso apenas via service role

-- ---------------------------------------------------------------------------
-- audit_logs, inventory_movements, notifications: admins lêem, service role escreve
-- ---------------------------------------------------------------------------

CREATE POLICY "admins visualizam logs de auditoria"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "admins visualizam movimentações de estoque"
  ON inventory_movements FOR SELECT
  USING (is_admin());

CREATE POLICY "admins gerenciam notificações"
  ON notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- SEGURANÇA DE COLUNAS (column-level security)
-- RLS controla quais LINHAS são visíveis — GRANT/REVOKE controla quais COLUNAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- products: anon nunca pode ver internal_notes nem cost_price
-- authenticated (admins) mantém acesso total via grant padrão do Supabase
-- ---------------------------------------------------------------------------

REVOKE SELECT ON TABLE products FROM anon;

GRANT SELECT (
  id, name, slug, sku, category_id,
  price_pix, price_card, price_promotional, promotional_active,
  is_active, is_featured,
  short_description, description, benefits, specifications, faq, warnings,
  stock, stock_minimum, availability,
  weight_kg, height_cm, width_cm, length_cm, extra_handling_days,
  compliance_type, requires_validation,
  allow_direct_buy, allow_whatsapp,
  meta_title, meta_description,
  created_at, updated_at
) ON TABLE products TO anon;

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Buckets criados via SQL migration — suportado desde Supabase 2023+
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images',    'product-images',    TRUE),
  ('category-images',   'category-images',   TRUE),
  ('admin-assets',      'admin-assets',       TRUE),
  ('private-documents', 'private-documents',  FALSE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Políticas de storage: product-images (público para leitura)
-- ---------------------------------------------------------------------------

CREATE POLICY "Imagens de produto são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins fazem upload de imagens de produto"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins atualizam imagens de produto"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins deletam imagens de produto"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- Políticas de storage: category-images (público para leitura)
-- ---------------------------------------------------------------------------

CREATE POLICY "Imagens de categoria são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

CREATE POLICY "Admins fazem upload de imagens de categoria"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'category-images' AND public.is_admin());

CREATE POLICY "Admins deletam imagens de categoria"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'category-images' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- Políticas de storage: admin-assets (público para leitura, escrita só admin)
-- ---------------------------------------------------------------------------

CREATE POLICY "Assets admin são públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'admin-assets');

CREATE POLICY "Admins fazem upload de assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'admin-assets' AND public.is_admin());

CREATE POLICY "Admins deletam assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'admin-assets' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- Políticas de storage: private-documents (acesso exclusivo para admins)
-- ---------------------------------------------------------------------------

CREATE POLICY "Admins lêem documentos privados"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'private-documents' AND public.is_admin());

CREATE POLICY "Admins fazem upload de documentos privados"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'private-documents' AND public.is_admin());

CREATE POLICY "Admins deletam documentos privados"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'private-documents' AND public.is_admin());

-- =============================================================================
-- DADOS INICIAIS OBRIGATÓRIOS (configurações padrão)
-- =============================================================================

INSERT INTO store_settings_public (
  lock, store_name, primary_color, whatsapp_number, meta_title
) VALUES (
  TRUE,
  'Premium Store',
  '#c9a84c',
  '5511999999999',
  'Premium Store — Qualidade e exclusividade'
) ON CONFLICT (lock) DO NOTHING;

INSERT INTO store_settings_private (
  lock, maintenance_mode
) VALUES (
  TRUE, FALSE
) ON CONFLICT (lock) DO NOTHING;

-- Transportadoras padrão
INSERT INTO shipping_methods (code, name, carrier, is_active, sort_order) VALUES
  ('SEDEX',     'SEDEX',      'Correios',  TRUE, 1),
  ('PAC',       'PAC',        'Correios',  TRUE, 2),
  ('JADLOG_E',  'Jadlog .E',  'Jadlog',    TRUE, 3),
  ('TOTAL_EXP', 'Total',      'Total Express', TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- Segmentos padrão de clientes
INSERT INTO customer_segments (name, description, color) VALUES
  ('VIP',        'Clientes de alto valor com histórico de compras premium', '#c9a84c'),
  ('Recorrente', 'Clientes que já fizeram 3 ou mais pedidos',               '#6366f1'),
  ('Inativo',    'Clientes sem compras nos últimos 90 dias',                '#6b7280')
ON CONFLICT (name) DO NOTHING;
