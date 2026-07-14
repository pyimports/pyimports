# Arquitetura do Projeto — ecommerce-premium

## Resumo Executivo

Plataforma de e-commerce full-stack construída com **Next.js 16 + React 19 + Supabase + Tailwind CSS 4**. Projeto em **Fase 1 (MVP)** com dados mockados como fallback. Fases 2 e 3 integram Mercado Pago (pagamentos) e Melhor Envio (frete em tempo real).

A arquitetura separa claramente:
- **Storefront público** — home, catálogo, produto, carrinho, checkout
- **Painel admin** — dashboard, CRUD de entidades, pedidos, relatórios
- **Backend** — Server Actions + Route Handlers + RLS no Supabase
- **Estado local** — Zustand para carrinho (persistido no localStorage)

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.9 |
| UI | React / React DOM | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Styling | Tailwind CSS + PostCSS | ^4 |
| Database / Auth / Storage | Supabase (supabase-js + ssr) | ^2.108.1 / ^0.12.0 |
| State Management | Zustand (com persist) | ^5.0.14 |
| Icons | Lucide React | ^1.18.0 |

**Futuras integrações (roadmap):**
- Mercado Pago SDK — pagamentos PIX/cartão (Fase 2)
- Melhor Envio SDK — frete em tempo real (Fase 3)

---

## Estrutura de Pastas

```
ecommerce-premium/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Grupo de rotas públicas (PublicLayout)
│   │   │   ├── acompanhar-pedido/
│   │   │   ├── carrinho/
│   │   │   ├── catalogo/
│   │   │   ├── categoria/[slug]/
│   │   │   ├── checkout/
│   │   │   ├── pagamento/[orderId]/
│   │   │   ├── pedido-confirmado/[orderId]/
│   │   │   ├── produtos/[slug]/
│   │   │   └── layout.tsx            # Navbar + Footer + WhatsApp button
│   │   │
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   ├── (protected)/          # Requer autenticação (AdminShell)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── produtos/
│   │   │   │   │   ├── novo/
│   │   │   │   │   └── [id]/editar/
│   │   │   │   ├── categorias/
│   │   │   │   ├── banners/
│   │   │   │   ├── pedidos/
│   │   │   │   │   └── [id]/
│   │   │   │   ├── clientes/
│   │   │   │   │   └── [id]/
│   │   │   │   ├── cupons/
│   │   │   │   ├── feedbacks/
│   │   │   │   ├── relatorios/
│   │   │   │   ├── configuracoes/
│   │   │   │   └── preview-mobile/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/admin/                # Route Handlers (upload de imagens)
│   │   │   ├── upload/route.ts
│   │   │   ├── upload-banner/route.ts
│   │   │   ├── upload-category/route.ts
│   │   │   └── upload-review/route.ts
│   │   │
│   │   ├── layout.tsx                # Root layout (HTML global)
│   │   ├── page.tsx                  # Homepage
│   │   └── globals.css               # Tailwind + variáveis CSS
│   │
│   ├── components/
│   │   ├── admin/                    # Componentes exclusivos do admin
│   │   ├── common/                   # UI genérico (Button, Input, Modal, etc.)
│   │   ├── layout/                   # PublicNavbar, PublicFooter, WhatsAppButton
│   │   ├── public/                   # Componentes do storefront
│   │   └── shared/                   # Compartilhados entre admin e público
│   │
│   ├── data/                         # Mocks (fallback sem Supabase)
│   ├── lib/
│   │   ├── actions/                  # Server Actions
│   │   ├── db/                       # Queries ao Supabase
│   │   ├── supabase/                 # client.ts + server.ts
│   │   ├── env.ts
│   │   ├── formatters.ts
│   │   ├── pricing.ts
│   │   ├── routes.ts
│   │   ├── utils.ts
│   │   └── whatsapp.ts
│   │
│   ├── store/
│   │   └── cart-store.ts             # Zustand store do carrinho
│   │
│   └── types/
│       ├── index.ts                  # Tipos de domínio
│       └── database.types.ts         # Tipos gerados pelo Supabase CLI
│
├── supabase/
│   ├── migrations/                   # 008 migrations SQL
│   └── seed.sql
│
├── public/
├── .env.example
├── .env.local                        # Gitignored
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── package.json
```

---

## Mapa de Rotas

### Storefront (público)

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/` | Homepage — banners, categorias, produtos em destaque |
| GET | `/catalogo` | Listagem completa de produtos |
| GET | `/categoria/[slug]` | Produtos filtrados por categoria |
| GET | `/produtos/[slug]` | Detalhe do produto |
| GET | `/carrinho` | Carrinho (client-side, Zustand) |
| POST | `/checkout` | Server Action: cria pedido |
| GET | `/pagamento/[orderId]` | Gateway de pagamento PIX |
| GET | `/pedido-confirmado/[orderId]` | Confirmação pós-pagamento |
| GET | `/acompanhar-pedido` | Rastreamento de pedido |

### Admin (protegido)

| URL | Descrição |
|-----|-----------|
| `/admin/login` | Login |
| `/admin/dashboard` | KPIs do dia |
| `/admin/produtos` | Listagem de produtos |
| `/admin/produtos/novo` | Criar produto |
| `/admin/produtos/[id]/editar` | Editar produto |
| `/admin/categorias` | CRUD de categorias |
| `/admin/banners` | CRUD de banners da home |
| `/admin/pedidos` | Listagem de pedidos |
| `/admin/pedidos/[id]` | Detalhe + alterar status |
| `/admin/clientes` | Listagem de clientes |
| `/admin/clientes/[id]` | Detalhe do cliente |
| `/admin/cupons` | CRUD de cupons |
| `/admin/feedbacks` | Moderação de avaliações |
| `/admin/relatorios` | Relatórios de vendas |
| `/admin/configuracoes` | Configurações da loja |
| `/admin/preview-mobile` | Preview responsivo |

### API Routes

| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/admin/upload` | Upload de imagem de produto → Supabase Storage |
| POST | `/api/admin/upload-banner` | Upload de imagem de banner |
| POST | `/api/admin/upload-category` | Upload de imagem de categoria |
| POST | `/api/admin/upload-review` | Upload de imagem de review |

---

## Componentes Principais

### Layout & Estrutura

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| `PublicNavbar` | `components/layout/` | Navbar responsiva com carrinho |
| `PublicFooter` | `components/layout/` | Footer com links |
| `WhatsAppButton` | `components/layout/` | Botão flutuante WhatsApp |
| `AdminShell` | `components/admin/` | Container admin (sidebar + topbar) |
| `AdminSidebar` | `components/admin/` | Menu lateral de navegação |
| `AdminTopbar` | `components/admin/` | Barra superior com usuário |

### Storefront

| Componente | Descrição |
|-----------|-----------|
| `HeroBannerCarousel` | Carrossel automático de banners |
| `CategoryCircle` | Círculo clicável de categoria (home) |
| `CategoryCard` | Card retangular de categoria |
| `ProductCard` | Card de produto (grid) |
| `ProductGallery` | Galeria com zoom e thumbnails |
| `TestimonialsSection` | Carrossel de reviews |
| `AddToCartButton` | Botão + seletor de quantidade |
| `CartItem` | Linha de item no carrinho |
| `CartSummary` | Subtotal, desconto, frete, total |
| `CheckoutSteps` | Indicador de progresso (4 passos) |
| `CouponInput` | Campo de código de cupom |
| `PriceBox` | Exibição de preços Pix vs Card |
| `OrderStatusTimeline` | Timeline visual de status |
| `ShippingCalculatorMock` | Simulador de frete |

### Admin — Gerenciamento

| Componente | Descrição |
|-----------|-----------|
| `MediaUploader` | Upload de imagem com Supabase Storage |
| `ImageFramingEditor` | Editor de posicionamento de imagem |
| `PriceTierEditor` | Editor de tiers de preço (qty vs preço) |
| `ProductPreviewCard` | Prévia do produto durante edição |
| `OrderStatusSelect` | Dropdown de status de pedido |
| `StatCard` | Card de KPI com trend indicator |
| `ReportCard` | Card de relatório |

### UI Genérico (`components/common/`)

`Button`, `Input`, `Select`, `Modal`, `Card`, `Badge`, `Tabs`, `Toggle`, `SearchInput`, `SectionHeader`, `Skeleton`, `EmptyState`

---

## Estado Global (Zustand)

**CartStore** — `src/store/cart-store.ts` — persistido no localStorage.

```typescript
interface CartItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_sku: string;
  product_image?: string;
  price_pix: number;        // preço unitário efetivo (resolvido por tier)
  base_price_pix: number;   // preço base sem tier
  price_card: number;
  price_tiers?: PriceTier[];
  quantity: number;
  track_stock: boolean;
  stock: number | null;
}

interface CartState {
  items: CartItem[];
  shipping_option: ShippingOption | null;
  coupon_code: string | null;
  coupon_discount: number;
  coupon_type?: CouponType;
}

// Actions disponíveis:
// addItem | removeItem | updateQuantity | clearCart
// setShipping | clearShipping
// setCoupon | clearCoupon
// getSubtotal | getShippingValue | getCouponDiscount
// getTotalPix | getTotalCard | getItemCount
```

---

## Banco de Dados (Supabase / PostgreSQL)

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `admin_profiles` | Usuários admin (id = auth.users.id) |
| `categories` | Categorias com imagens desktop/mobile |
| `products` | Produtos com preços, estoque, specs, FAQs, tiers |
| `product_media` | Mídias do produto (imagens/vídeos) |
| `customers` | Clientes com endereço, VIP flag, métricas |
| `customer_notes` | Anotações internas por cliente |
| `customer_segments` | Segmentação de clientes |
| `orders` | Pedidos com status, pagamento, endereço, totais |
| `order_items` | Itens desnormalizados (product_name, prices) |
| `order_status_history` | Histórico de mudanças de status |
| `payments` | Pagamentos (método, status, PIX QR) |
| `payment_webhooks` | Log de webhooks (Mercado Pago) |
| `coupons` | Cupons com restrições, limites, datas |
| `coupon_usages` | Histórico de uso de cupons |
| `home_banners` | Banners do carrossel com positioning |
| `reviews` | Avaliações com imagens e vídeos |
| `shipping_quotes` | Cache de cotações de frete |
| `shipping_methods` | Métodos de envio disponíveis |
| `store_settings_public` | Configurações públicas (nome, logo, WhatsApp) |
| `store_settings_private` | Chaves privadas (PIX, Mercado Pago, Melhor Envio) |
| `audit_logs` | Logs de auditoria (ações admin) |
| `inventory_movements` | Movimentação de estoque |
| `notifications` | Notificações internas |

### Segurança (RLS)

- **Anon key**: leitura de dados públicos (products, categories, reviews ativos)
- **Service role key**: acesso completo — usado apenas no servidor (Server Actions e Route Handlers)

### Migrations

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_home_banners.sql
├── 003_home_banners_positioning.sql
├── 004_category_images.sql
├── 005_feature_expansion.sql
├── 006_review_image_framing.sql
├── 007_category_image_framing.sql
└── 008_fix_anon_product_columns.sql
```

---

## Camada de Dados — Queries (`src/lib/db/`)

```typescript
// Produtos
getFeaturedProducts()           // is_featured=true, is_active=true
getProductsByCategory(id)
getProductBySlug(slug)          // com media
getRelatedProducts(id)

// Categorias
getFeaturedCategories()         // is_featured_home=true
getAllActiveCategories()
getCategoryBySlug(slug)

// Pedidos (admin)
getAllOrdersAdmin()
getOrderByIdAdmin(id)           // com items + history
getDashboardKPIs()              // pedidos/faturamento/estoque/clientes do dia

// Admin
getAllCategoriesAdmin()
getAllProductsAdmin()
getProductByIdAdmin(id)
getCategoriesForSelect()
getProductsForSelect()

// Banners & Reviews
getActiveBanners()              // ordenados
getActiveReviews()              // com produto
```

---

## Server Actions (`src/lib/actions/`)

### Auth
- `loginAdmin(email, password)` — login + verificação em admin_profiles
- `logoutAdmin()` — logout + redirect

### Products
- `createProduct(data)` — cria produto com UUID pré-gerado
- `updateProduct(id, data)` — edita produto
- `deleteProduct(id)` — soft delete

### Categories
- `createCategory(data)` / `updateCategory(id, data)`

### Orders
- `updateOrderStatus(orderId, newStatus, notes)` — insere em order_status_history

### Checkout (crítico)
- `createOrder(formData)` — executa **no servidor**:
  1. Resolve produtos reais (preços, tiers, estoque)
  2. Valida cupom
  3. Recalcula todos os totais
  4. Cria `orders` + `order_items` + `payments`
  5. Retorna `orderId` para redirect

### Media
- `uploadProductImage`, `uploadBannerImage`, `uploadCategoryImage`, `uploadReviewImage` — upload para Supabase Storage

### Reviews & Banners
- `createReview` / `updateReview`
- `createBanner` / `updateBanner`

---

## Tipos TypeScript Principais

### Produto
```typescript
interface Product {
  id, name, slug, sku
  category_id, category?
  price_pix, price_card, price_promotional, promotional_active
  is_active, is_featured
  short_description, description, benefits
  specifications: ProductSpecification[]   // { label, value }[]
  faq: ProductFAQ[]                        // { question, answer }[]
  warnings?
  media?: ProductMedia[]
  stock, stock_minimum
  availability: "in_stock" | "low_stock" | "out_of_stock" | "on_consultation"
  track_stock, quantity_pricing_enabled
  price_tiers?: PriceTier[]               // { quantity, unit_price }[]
  weight_kg, height_cm, width_cm, length_cm, extra_handling_days
  compliance_type: "common" | "regulated" | "requires_validation" | "on_consultation"
  requires_validation, allow_direct_buy, allow_whatsapp
  meta_title?, meta_description?, internal_notes?
  created_at, updated_at
}
```

### Pedido
```typescript
type OrderStatus =
  | "pending_payment" | "payment_confirmed" | "awaiting_validation"
  | "awaiting_separation" | "shipped" | "delivered" | "cancelled"

interface Order {
  id, order_number
  customer_id, customer_name, customer_phone, customer_email
  status, payment_status
  payment_method: "pix" | "card"
  payment_id?
  // Endereço de entrega
  shipping_street, shipping_number, shipping_complement?
  shipping_neighborhood, shipping_city, shipping_state, shipping_zip_code
  // Totais
  subtotal, coupon_code?, coupon_discount
  shipping_value, shipping_service?, total
  items?: OrderItem[]
  status_history?: OrderStatusHistory[]
  notes?, internal_notes?
  created_at, updated_at
}
```

---

## Variáveis de Ambiente

```bash
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # apenas servidor

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Fase 2 — Mercado Pago
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=

# Fase 3 — Melhor Envio
MELHOR_ENVIO_TOKEN=
```

---

## Configurações do Projeto

### `next.config.ts`
```typescript
images: {
  remotePatterns: [
    "images.unsplash.com",
    "picsum.photos",
    "via.placeholder.com",
    "placehold.co",
    "*.supabase.co/storage/v1/object/public/**"
  ]
}
```

### `tsconfig.json`
- Target: ES2017 | Strict: true | JSX: react-jsx
- Path alias: `@/*` → `./src/*`

### Tailwind / Globals
- Dark theme com variáveis CSS customizadas
- Paleta: `dark-bg`, `dark-surface`, `dark-text`, `muted`, `accent` (gold), `whatsapp`
- Utilitários custom: `.divider-gold`, `.eyebrow-label`, `.text-gradient-gold`, `.step-number`

---

## Utilitários (`src/lib/`)

### `formatters.ts`
| Função | Saída |
|--------|-------|
| `formatCurrency(num)` | `"R$ 1.299,90"` |
| `formatDate(str)` | `"1 de junho de 2026"` |
| `formatDateShort(str)` | `"01/06/2026"` |
| `formatDateTime(str)` | `"01/06/2026 14:30"` |
| `formatCep(str)` | `"12345-678"` |
| `formatCpf(str)` | `"123.456.789-01"` |
| `slugify(text)` | `"meu-produto"` |
| `toYoutubeEmbedUrl(url)` | URL de embed normalizada |
| `relativeTime(str)` | `"há 2 horas"` |

### `pricing.ts`
- `getTierUnitPrice(base, tiers, qty)` — preço unitário após tier
- `buildQuantityPriceOptions(base, tiers)` — lista opções com economias

### `routes.ts`
- Constantes: `routes.home`, `routes.catalogo`, `routes.admin.dashboard`, etc.
- Funções: `routes.categoria(slug)`, `routes.produto(slug)`, `routes.admin.pedido(id)`

### `whatsapp.ts`
- `generateStoreWhatsAppLink()` — link wa.me com mensagem pré-formatada

---

## Fluxos de Negócio Críticos

### Compra (Checkout → Pagamento)
1. Cliente seleciona produtos e quantidade → **CartStore** (localStorage)
2. Aplica cupom (validação preliminar client-side)
3. Clica "Finalizar" → `/checkout` — preenche dados + endereço
4. Server Action `createOrder()`:
   - Busca produtos reais do banco
   - Recalcula preços (promotional, tiers)
   - Valida cupom no servidor
   - Verifica estoque
   - Cria `orders` + `order_items` + `payments`
   - Retorna `orderId`
5. Redirect para `/pagamento/[orderId]` — exibe PIX QR (simulado)
6. Após pagamento → `/pedido-confirmado/[orderId]`

### Admin — Criar Produto
1. `/admin/produtos/novo` — preenche NovoProdutoForm
2. Upload de imagens via `MediaUploader` → Supabase Storage
3. Configura preços, tiers, specs, FAQs
4. Server Action `createProduct()`:
   - Insere em `products`
   - Cria registros em `product_media`
   - `revalidatePath()` para limpar cache
5. Redirect para `/admin/produtos`

### Admin — Processar Pedido
1. `/admin/pedidos` — lista via PedidosClient
2. Clica no pedido → `/admin/pedidos/[id]` — PedidoClient
3. Altera status via `OrderStatusSelect`
4. Server Action `updateOrderStatus()`:
   - Atualiza `orders.status`
   - Insere em `order_status_history`
5. Cliente acompanha em `/acompanhar-pedido`

---

## Padrões de Código

### Server vs Client Components
- **Server Components (padrão)**: páginas que buscam dados, layouts — sem state, sem eventos
- **Client Components (`"use client"`)**: formulários, modais, carrosséis, qualquer interatividade

### Fallback para Mocks
Pages tentam banco primeiro; se falhar, usam mocks:
```typescript
try {
  data = await dbGetFeaturedProducts();
} catch {
  data = mockGetFeaturedProducts();
}
```

### Revalidação de Cache
Server Actions chamam `revalidatePath()` após mutações.

### Segurança
- Preços recalculados no servidor (nunca confiar no cliente)
- Service role key usada apenas em Server Actions e Route Handlers
- Guard `requireAdmin()` em todas as actions admin
- RLS no Supabase como segunda camada de proteção
