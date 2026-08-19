# Migração da integração Zendry — PYimports → novo projeto

Auditoria completa da integração de pagamentos Zendry (Pix + Cartão) tal
como implementada no projeto **PYimports**, com tudo o que é necessário pra
reproduzi-la em outro projeto. Gerado em 2026-07-31.

> Este documento descreve a integração **como ela realmente está no código**,
> não como a documentação da Zendry idealmente descreve — em vários pontos as
> duas coisas divergem (anotado explicitamente onde acontece).

---

## 1. Visão geral

- Gateway: **Zendry** (`https://api.zendry.com.br`), adquirente direto —
  não há sandbox confirmado; toda a integração foi validada contra produção.
- **Pix**: QR Code + código copia-e-cola gerados na própria página de
  pagamento (`POST /v1/pix/qrcodes`). Sem redirecionamento externo.
- **Cartão**: dados do cartão (número/validade/CVV) enviados diretamente ao
  nosso backend, que repassa pra Zendry (`POST /v1/card_payments`). **3DS é
  obrigatório** — implementado via SDK client-side que roda no navegador do
  cliente.
- **Confirmação**: webhook único (`/api/payments/webhook/zendry`) recebe
  eventos de Pix e cartão; cartão também tem confirmação síncrona na
  resposta do POST inicial.
- Não há checkout hospedado em uso hoje (existiu numa versão anterior,
  código mantido como fallback inerte — ver seção 3).

---

## 2. Arquivos envolvidos (projeto de origem)

| Arquivo | Papel |
|---|---|
| `src/lib/payments/types.ts` | Interface `PaymentProvider` genérica (não específica da Zendry) |
| `src/lib/payments/zendry-provider.ts` | Autenticação + criação de Pix |
| `src/lib/payments/create-preference.ts` | Orquestra: busca pedido → chama provider → persiste no banco |
| `src/lib/payments/process.ts` | `processPaymentResult` — única função que marca pedido como pago/falho |
| `src/lib/payments/index.ts` | Fábrica do provider ativo (`getPaymentProvider`) |
| `src/lib/payments/mode.ts` | Flag `PAYMENT_MODE` ("gateway" Zendry ativo vs "manual" fallback) |
| `src/lib/actions/card-payment.ts` | Server Action de pagamento por cartão (chamada direta, fora do fluxo de criação do pedido) |
| `src/lib/actions/checkout.ts` | Cria o pedido e dispara `createPaymentPreferenceForOrder` |
| `src/app/api/payments/zendry-3ds-token/route.ts` | Expõe o access_token pro SDK de 3DS no navegador |
| `src/app/api/payments/webhook/zendry/route.ts` | Recebe confirmações (Pix + cartão + checkout legado) |
| `src/app/api/payments/dev-confirm/route.ts` | Simula webhook aprovado — só funciona sem gateway real configurado |
| `src/components/public/PagamentoClient.tsx` | UI: QR Pix, formulário de cartão, SDK 3DS |
| `src/lib/pricing.ts` | `CARD_INSTALLMENT_RATES`, `computeCardTotalForInstallments` |
| `supabase/migrations/001_initial_schema.sql` | Tabelas `payments`, `payment_webhooks` |

---

## 3. Variáveis de ambiente

| Nome | Obrigatória | Descrição |
|---|---|---|
| `ZENDRY_CLIENT_ID` | Sim | Client ID da conta Zendry (Basic Auth) |
| `ZENDRY_CLIENT_SECRET` | Sim | Client Secret da conta Zendry (Basic Auth) |
| `ZENDRY_WEBHOOK_SECRET` | Sim | Segredo **gerado por nós** (não pela Zendry), validado como `?key=` na URL do webhook |
| `NEXT_PUBLIC_APP_URL` | Sim (pra registrar o webhook) | URL pública do projeto |
| `PICPAY_TOKEN` | Não | Legado — vazio; se preenchido, o `getPaymentProvider()` cairia pro provider PicPay em vez do Zendry |

Valores reais do projeto de origem: ver `.env.zendry.migration.local` (criado
na raiz do projeto, **não commitado** — coberto pelo `.gitignore` genérico
`.env*`). Nomes sem valores: `.env.zendry.example`.

---

## 4. Credenciais e configurações (mascaradas)

| Nome | Variável | Valor mascarado | Origem | Ambiente | Obrigatória |
|---|---|---|---|---|---|
| Client ID | `ZENDRY_CLIENT_ID` | `0ddf...1fdf` | `.env.local` (raiz do projeto) + Vercel Production | Produção (não há sandbox) | Sim |
| Client Secret | `ZENDRY_CLIENT_SECRET` | `5c03...8119` | `.env.local` + Vercel Production | Produção | Sim |
| Webhook Secret | `ZENDRY_WEBHOOK_SECRET` | `8c76...22ca` | `.env.local` + Vercel Production | Produção | Sim |
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | `https://zmrl...co` | `.env.local` | — | Não (é do banco, não da Zendry) |

**Não existem** (confirmado — não usados nesta integração): Merchant ID,
Seller ID, Account ID, Company ID, Public Key, usuário/senha de API, código
de loja, credenciais de sandbox separadas. A conta é identificada
implicitamente pelo par Client ID/Secret no momento de gerar o token OAuth.

---

## 5. Configuração de IP

- **Nenhuma whitelist de IP está ativa** nesta conta Zendry hoje.
- A Zendry **confirmou por escrito** (suporte, via chat) que:
  - O token usado no SDK de 3DS (client-side) é o **mesmo** `access_token`
    das chamadas server-to-server.
  - É possível whitelistar por IP **rotas específicas da API** (ex.:
    `/v1/pix/qrcodes`, `/v1/card_payments`) — mas **não** o fluxo de 3DS em
    si, porque ele roda no navegador do cliente final (IP dele, não do seu
    servidor), e não tem como restringir isso por IP sem quebrar o SDK.
  - Cadastro de IP é feito informando à Zendry os IPs autorizados
    (contato direto com o suporte — não há endpoint de API documentado pra
    isso nas páginas consultadas).
- **IP de saída do ambiente atual**: o projeto de origem roda no **Vercel,
  plano Hobby (gratuito)** — não tem IP de saída fixo (pool dinâmico de IPs).
  IP fixo ("Secure Compute") no Vercel exige plano **Pro pago** + custo
  adicional. Verificado no dashboard: `vercel.com/<time>/~/settings/billing`
  mostrava "Hobby Plan — Active" no momento da auditoria.
- **Decisão tomada no projeto de origem**: seguir **sem** whitelist de IP,
  aceitando o risco residual (token de 3DS exposto no navegador, sem camada
  extra de proteção nas outras rotas). Decisão consciente do dono do
  projeto, não uma limitação técnica não avaliada.
- **Pro projeto novo**: se for usar Vercel Hobby também, a mesma limitação
  se aplica — não dá pra configurar whitelist de IP de forma útil sem uma
  origem de saída fixa (Vercel Pro + Secure Compute, ou rotear as chamadas
  server-to-server por um proxy/VPS com IP fixo).

---

## 6. Autenticação

**OAuth `client_credentials`, Basic Auth → Bearer token.**

```
POST https://api.zendry.com.br/auth/generate_token
Authorization: Basic base64(ZENDRY_CLIENT_ID:ZENDRY_CLIENT_SECRET)
Content-Type: application/json

{ "grant_type": "client_credentials" }
```

Resposta (200):
```json
{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 1800 }
```

Todas as chamadas subsequentes usam `Authorization: Bearer ${access_token}`.
Token cacheado em memória no processo do servidor, renovado com 60s de
folga antes de expirar (implementação: `getZendryAccessToken()` em
`zendry-provider.ts`, reaproveitada por `card-payment.ts`).

Não há HMAC, assinatura de requisição, nonce, timestamp ou idempotency key
nas chamadas de criação (Pix/cartão) — a única coisa parecida com
idempotência é o `external_reference`/`external_id` que nós mesmos
enviamos, sem garantia documentada da Zendry sobre deduplicação do lado
deles.

---

## 7. Pix — fluxo completo

1. Cliente finaliza o checkout no site → pedido é criado no banco
   (`orders` + `order_items`), status `pending_payment`.
2. `createPaymentPreferenceForOrder()` busca o pedido recém-criado e chama
   `zendryProvider.createPreference()`.
3. Payload real enviado:

```
POST https://api.zendry.com.br/v1/pix/qrcodes
Authorization: Bearer ${token}
Content-Type: application/json

{
  "value_cents": 82000,
  "generator_name": "Nome do Cliente",
  "generator_document": "39212772307",
  "expiration_time": "1800",
  "external_reference": "RF00006"
}
```

   Campos: `value_cents` (obrigatório, centavos), `generator_name`
   (obrigatório), `generator_document` (opcional — CPF/CNPJ), `expiration_time`
   (obrigatório, segundos como **string**), `external_reference`
   (obrigatório — usamos o número legível do pedido, não o UUID interno).
   **Não há** campo de e-mail, telefone, endereço, metadata ou
   `callback_url` nesse payload.

4. Resposta (201):
```json
{
  "qrcode": {
    "reference_code": "c17917b8-4ff8-4eed-839b-8156ffd...",
    "content": "00020126850014br.gov.bcb.pix2563pix.onlyup.com.br/qr/v3/at/...",
    "image_base64": "iVBORw0KGgoAAAANSU..."
  }
}
```

5. `reference_code` é salvo em `payments.external_id`; `content` em
   `payments.pix_code`; `image_base64` convertido pra data URL e salvo em
   `payments.pix_qr_url`.
6. Frontend (`PagamentoClient.tsx`) renderiza o QR **gerado localmente**
   a partir do `pix_code` (via `qrcode.react`, não a imagem que a Zendry
   devolve) — permite embutir a logo da marca no centro do QR.
7. **Consulta de status**: não existe endpoint confirmado. Tentativas de
   `GET /v1/charges/{reference_code}` e variações contra a API real não
   retornaram nada utilizável. A confirmação depende 100% do webhook.
8. Webhook `pix_qrcode` chega → `processPaymentResult()` marca
   `payments.status = confirmed`, `orders.payment_status = confirmed`,
   dispara transição de status do pedido (+ triggers de baixa de estoque,
   que são específicos do schema do projeto de origem, não da Zendry).
9. **Duplicidade evitada** por constraint única `(external_id, action)` na
   tabela `payment_webhooks` — segunda tentativa do mesmo evento colide no
   INSERT e é ignorada.

---

## 8. Cartão — fluxo completo

**Modelo: adquirente direto.** Número do cartão, validade e CVV são
enviados **diretamente ao nosso backend** (Server Action), que repassa pra
Zendry. **Não há tokenização client-side** nesse fluxo — existe um endpoint
documentado `POST /v1/card_payments/tokenize_card`, mas **não é usado** na
integração de origem (não foi testado se é obrigatório).

> Implicação: isso coloca o comerciante no escopo **PCI-DSS SAQ D** — vale
> pra qualquer venda com cartão, doméstica ou internacional (não é regra
> exclusiva de comércio internacional, correção feita durante o
> desenvolvimento original). Decisão consciente do dono do projeto de
> origem.

### 3DS — obrigatório, sem exceção

Confirmado testando contra a API real: toda tentativa de
`POST /v1/card_payments` **sem** `threeds_data` retorna:
```json
{ "error": "Threeds data is required" }
```
HTTP 422 — sem exceção, mesmo pra valores baixos.

**Fluxo de 3DS (roda no navegador do cliente):**

1. Backend expõe um endpoint que devolve o `access_token` atual:
   `GET /api/payments/zendry-3ds-token` → `{ "token": "..." }`.
2. Frontend carrega o SDK:
   ```html
   <script src="https://cdn.zendry.com/v1/zendry-sdk-threeds.min.js"></script>
   ```
3. Frontend chama:
   ```js
   const result = await ZendrySDKThreeds.init_threeds({
     token: accessToken, // MESMO token do passo 1 — exposto no navegador
     amount: 82000, // centavos
     payment_form: {
       network_preference: "VISA", // VISA | MASTERCARD | ELO | AMEX
       account_type: "CREDIT",
       pan: "4111111111111111",
       expiry_month: "12",
       expiry_year: "29",
       card_holder_name: "NOME IMPRESSO",
       installment_number: 3,
       issuer_installment: false,
     },
   });
   ```
4. Se aprovado, `result.three_ds_data` contém:
   ```json
   {
     "operation_session_id": "...",
     "cavv": "...",
     "xid": "...",
     "eci": "...",
     "secure_version": "...",
     "directory_server_transaction_id": "...",
     "three_ds_server_transaction_id": "..."
   }
   ```
5. Frontend completa esse objeto com dados do próprio navegador
   (`ip_address` — capturado no **servidor**, via header
   `x-forwarded-for`, nunca confiar no que o navegador reportar sobre si
   mesmo; `user_agent_browser_value`, `http_browser_language`,
   `http_browser_screen_height/width`, `zip_code` — CEP de cobrança digitado
   no formulário) e manda tudo pra Server Action `payWithCard()`.

### Payload real enviado (`POST /v1/card_payments`)

```json
{
  "card_payment": {
    "external_id": "8f2e1a3b-...", // UUID do pedido
    "amount": 87374, // centavos — JÁ com a taxa da parcela somada, não é o valor "cru" do pedido
    "currency": "BRL",
    "payment_type": "CREDIT",
    "card_number": "4111111111111111",
    "card_expiration_date": "122029", // MMyyyy
    "card_security_code": "123",
    "card_holder_name": "NOME IMPRESSO",
    "card_holder_document": "39212772307",
    "installments": 3,
    "threeds_data": {
      "operation_session_id": "...",
      "cavv": "...",
      "xid": "...",
      "eci": "...",
      "secure_version": "...",
      "directory_server_transaction_id": "...",
      "three_ds_server_transaction_id": "...",
      "ip_address": "200.x.x.x",
      "user_agent_browser_value": "Mozilla/5.0 ...",
      "http_browser_language": "pt-BR",
      "http_browser_screen_height": "1080",
      "http_browser_screen_width": "1920",
      "zip_code": "01310100"
    }
  }
}
```

Campos documentados como obrigatórios dentro de `threeds_data`: **todos os
12 listados acima** (marcados "Sim" na documentação da Zendry). Campos
opcionais do nível superior do `card_payment` que **não são usados** na
integração de origem: `pass_fee_to_customer`, `billing_address`, `buyer`,
`payer`.

### Parcelas — taxa varia por parcela, não é markup fixo

A primeira versão da integração usava 18% fixo pra todo mundo — **estava
errado**. A taxa real da adquirente sobe conforme o número de parcelas
(tabela negociada com o adquirente, ex.: PYX Gate, linha "Bandeiras
padrão"/Mastercard — a mais cara, usada como referência única):

| Parcelas | Taxa | Parcelas | Taxa |
|---|---|---|---|
| 1x (à vista) | 6,85% | 8x | 12,59% |
| 2x | 8,15% | 9x | 13,31% |
| 3x | 8,84% | 10x | 14,05% |
| 4x | 9,54% | 11x | 14,79% |
| 5x | 10,24% | 12x | 15,54% |
| 6x | 10,95% | 13x | 16,29% |
| 7x | 11,86% | 14x | 17,05% |

O total cobrado (`amount` no payload) = valor base do pedido (preço Pix) ×
(1 + taxa da parcela escolhida) — **sempre recalculado no servidor**, nunca
confiando num total mandado pelo cliente (função
`computeCardTotalForInstallments`).

### Resposta (síncrona — não há etapa de captura separada)

```json
{
  "card_payment": {
    "muid": "...",
    "status": "accepted", // ou "reject" | "waiting_3ds_authentication"
    "transaction_status": "...",
    "last_digits": "1111",
    "brand": "VISA",
    "authorization_code": "..."
  }
}
```

- `status: "accepted"` → chama `processPaymentResult()` na hora (não espera
  webhook).
- `status: "reject"` → erro genérico "Pagamento recusado pela operadora".
- `status: "waiting_3ds_authentication"` → não deveria acontecer se o 3DS
  foi concluído antes; se acontecer, mensagem de erro clara pedindo pra
  tentar outro cartão/Pix.
- **Consulta / captura / cancelamento / estorno**: nenhum desses endpoints
  foi confirmado contra a API real. A resposta síncrona já traz o resultado
  final. Se precisar de estorno, confirme com o suporte da Zendry antes de
  implementar.

**Segurança**: `card_number`/`card_security_code` nunca são logados,
impressos em erro, nem persistidos — só `last_digits`/`brand`/
`authorization_code` da resposta.

---

## 9. Webhooks

### Rota única: `POST /api/payments/webhook/zendry?key=...`

| | |
|---|---|
| URL | `{NEXT_PUBLIC_APP_URL}/api/payments/webhook/zendry?key={ZENDRY_WEBHOOK_SECRET}` |
| Método | POST |
| Eventos | `notification_type`: `pix_qrcode`, `card_payment`, `checkout` (legado) |
| Autenticidade | Segredo **nosso**, embutido na query string (`?key=`) — ver nota abaixo |
| Resposta esperada | `200 { "ok": true }` sempre, EXCETO chave inválida → `401` |

### ⚠️ Divergência entre o que está implementado e o que a Zendry documenta

- **O que está implementado**: um segredo gerado por nós, verificado como
  query param `?key=` na URL de callback. Funciona (confirmado em produção),
  mas não é um mecanismo da Zendry — é uma checagem só nossa.
- **O que a documentação oficial descreve**: ao registrar um webhook via
  `POST /v1/webhooks/{webhook_type_id}` com body
  `{ "url": "...", "authorization": "valor_secreto" }`, a Zendry passaria a
  enviar esse `valor_secreto` de volta no header `Authorization` de toda
  chamada — um mecanismo mais forte.
- **Não foi possível confirmar** se esse registro foi feito nesta conta:
  uma tentativa de `GET /v1/webhooks` (listar webhooks registrados) durante
  esta auditoria retornou **HTTP 500**. Não há chamada a esse endpoint em
  nenhum lugar do código — o registro, se existe, foi feito manualmente fora
  do projeto (painel ou chamada avulsa).
- **Recomendação pro projeto novo**: usar o mecanismo oficial (header
  `Authorization`) desde o início, registrando o webhook via API com um
  valor de `authorization` gerado por vocês. O módulo `webhook.ts` entregue
  já tem as duas funções prontas (`verifyWebhookSecret` e
  `verifyWebhookHeader`).

### Payload recebido

```json
{
  "notification_type": "pix_qrcode",
  "message": {
    "reference_code": "c17917b8-...",
    "status": "paid",
    "payment_date": "2026-07-31T20:00:00Z"
  }
}
```

Pra `card_payment`, o identificador vem em `message.muid` em vez de
`message.reference_code`.

### Validação de status — não documentada oficialmente

A Zendry **não documenta** os valores exatos de `status` que manda nos
webhooks. O mapeamento usado é por substring, tolerante a variações:

```text
Zendry (substring, case-insensitive)     → status interno
------------------------------------------------------------
paid, complet*, confirm*, approv*,
success, accepted                         → approved (pago)
cancel*, expir*, refund, chargeback       → cancelled
reject*, fail*, denied, declin*, refus*   → rejected (recusado)
qualquer outro valor não reconhecido      → pending (análise/pendente)
```

Não há status distinto documentado pra "chargeback" vs "estornado" — ambos
caem em `cancelled` pelo mapeamento atual; se precisar diferenciar no
projeto novo, isso exige tratamento manual (não vem separado da Zendry de
forma confiável).

### Como o pedido é encontrado

`payments.external_id` = `reference_code` (Pix/checkout) ou `muid` (cartão)
— gravado no momento da criação da cobrança/pagamento, usado como chave de
busca quando o webhook chega.

### Duplicidade

Constraint única `(external_id, action)` onde
`action = "{notification_type}.{status_mapeado}"` — usa o status já
mapeado (não o texto cru), pra retentativas do mesmo evento colidirem, mas
uma mudança real de status contar como evento novo.

---

## 10. Estrutura das tabelas (Supabase/Postgres — referência)

```sql
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('pix', 'card');

CREATE TABLE payments (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  pix_code        TEXT,
  pix_qr_url      TEXT,
  pix_expiration  TIMESTAMPTZ,
  external_id     TEXT,          -- reference_code (Pix) ou muid (cartão)
  installments    INTEGER,
  paid_at         TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_external ON payments (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE payment_webhooks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT        NOT NULL,
  type          TEXT        NOT NULL,  -- ex: 'zendry_pix_qrcode'
  action        TEXT        NOT NULL,  -- ex: 'pix_qrcode.approved'
  raw_payload   JSONB       NOT NULL,
  processed     BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, action)
);
CREATE INDEX idx_webhooks_external ON payment_webhooks (external_id);
CREATE INDEX idx_webhooks_processed ON payment_webhooks (processed, created_at DESC);
```

Se o projeto novo não usa Supabase/Postgres, reproduza o equivalente:
tabela de pagamentos com `external_id` indexado, e uma tabela/mecanismo de
idempotência com constraint única em `(external_id, action)`.

---

## 11. Dependências

- `qrcode.react` — gera o QR do Pix no frontend a partir do código copia-e-cola (não é uma dependência da Zendry em si, mas do jeito como o QR é exibido no projeto de origem).
- Nenhuma lib oficial da Zendry no lado do servidor — tudo é `fetch` puro.
- SDK client-side da Zendry carregado via `<script>` externo
  (`https://cdn.zendry.com/v1/zendry-sdk-threeds.min.js`), não é um pacote npm.

---

## 12. Passo a passo — instalar no projeto novo

1. Copie a pasta `zendry-migration/src/lib/zendry/` inteira pro
   `src/lib/zendry/` do projeto novo.
2. Copie `zendry-migration/src/app/api/payments/zendry/` e
   `zendry-migration/src/app/api/webhooks/zendry/` pro `src/app/api/` do
   projeto novo (ajuste os caminhos se a estrutura de rotas for diferente).
3. Nas três rotas copiadas, resolva os comentários `// TODO:` — eles
   marcam exatamente onde entra a persistência (buscar pedido, salvar
   `external_id`, marcar como pago) específica do banco do projeto novo.
4. Copie `.env.zendry.example` pro projeto novo como referência de nomes de
   variável.
5. Preencha as variáveis reais (valores em `.env.zendry.migration.local`,
   nunca commitado) no `.env.local` do projeto novo.
6. Gere um `ZENDRY_WEBHOOK_SECRET` **novo** pro projeto novo (não precisa
   ser o mesmo da origem) — ex.: `openssl rand -hex 32`.
7. Registre o webhook na conta Zendry (contato com o suporte, ou
   `POST /v1/webhooks/{webhook_type_id}` se confirmado que esse endpoint
   funciona) apontando pra
   `https://SEU-DOMINIO/api/webhooks/zendry?key=SEU_ZENDRY_WEBHOOK_SECRET`.
8. Se for reproduzir também a UI de pagamento (QR Pix + formulário de
   cartão + SDK 3DS), use `PagamentoClient.tsx` do projeto de origem como
   referência — não incluído neste pacote de módulos porque é fortemente
   acoplado ao design system do projeto de origem.
9. Rode os testes da seção 13 antes de considerar pronto.

---

## 13. Passo a passo — testar

Ver `zendry-migration/scripts/README.md` pra detalhes completos. Resumo:

```bash
export ZENDRY_CLIENT_ID="..."
export ZENDRY_CLIENT_SECRET="..."
export ZENDRY_WEBHOOK_SECRET="..."

# 1. Autenticação (sem efeito colateral)
node zendry-migration/scripts/test-auth.mjs

# 2. Criação de Pix real (R$ 1,00 — sem sandbox, é produção de verdade)
node zendry-migration/scripts/test-pix-create.mjs

# 3. Webhook — simula chegada no SEU endpoint (rode o servidor local antes)
TARGET_URL=http://localhost:3000/api/webhooks/zendry \
  node zendry-migration/scripts/test-webhook.mjs

# 4. Cartão — confirma que a API exige 3DS (vai falhar de propósito, é o esperado)
CONFIRM_REAL_CARD_TEST=sim node zendry-migration/scripts/test-card-create.mjs
```

- **O que dá pra testar sem depender de nada externo**: autenticação,
  criação de Pix, o parsing/validação do seu endpoint de webhook.
- **O que depende de IP liberado**: nada hoje — não há whitelist ativa. Se
  configurar uma no futuro, todas as chamadas server-to-server passam a
  depender do IP de saída estar na lista.
- **O que depende do painel/suporte da Zendry**: registro do webhook
  (`url` + segredo), qualquer mudança de whitelist de IP.
- **O que depende de webhook público**: confirmar que uma cobrança Pix real
  é marcada como paga automaticamente — exige a URL do webhook acessível
  publicamente (não `localhost`) e registrada na conta.
- **Teste de cartão completo**: só é possível abrindo a tela de pagamento
  de verdade num navegador, com um cartão real, passando pelo desafio 3DS —
  não é simulável por script.

---

## 14. Possíveis erros

| Erro | Causa provável |
|---|---|
| `401` em `/auth/generate_token` | Client ID/Secret errados ou trocados |
| `422 {"error":"Threeds data is required"}` | Tentou criar pagamento de cartão sem `threeds_data` — esperado, não é bug |
| `403` genérico em rotas não documentadas | Rota não existe ou método errado — a Zendry retorna uma mensagem de gateway genérica, não um 404 claro |
| `500` em `GET /v1/webhooks` | Reproduzido durante esta auditoria — endpoint pode não estar disponível pra essa conta, ou exigir outro formato; não investigado a fundo |
| Webhook nunca chega | URL não registrada na Zendry, ou registrada com o `?key=` errado |
| Pedido nunca confirma mesmo com Pix pago | Verifique se o trigger/lógica de baixa de estoque do projeto novo não está bloqueando o UPDATE de `payment_status` (no projeto de origem isso já causou um bug real — pedido ficava preso em "pendente" mesmo com o pagamento confirmado) |
| Cartão sempre recusado mesmo com 3DS ok | Confira se o `amount` enviado pro SDK de 3DS (passo do navegador) bate exatamente com o `amount` enviado depois no `POST /v1/card_payments` (passo do servidor) — os dois precisam ser o mesmo valor |

---

## 15. Diferenças entre teste e produção

**Não existem.** Não foi encontrado nem documentado nenhum ambiente de
sandbox pra essa API — toda a integração de origem foi desenvolvida e
testada contra `https://api.zendry.com.br` (produção), usando valores
baixos (R$ 1,00) como "teste". Isso significa:

- Todo teste de criação de Pix gera uma cobrança real (não precisa ser paga).
- Todo teste de cartão, se passar da validação de 3DS, é uma tentativa de
  cobrança real.
- Não há flag de "modo teste" na API nem nas credenciais.

Se o projeto novo precisar de um ambiente separado pra QA, considere pedir
ao suporte da Zendry uma conta/credenciais de teste dedicada — não foi
confirmado se isso existe como oferta padrão deles.

---

## 16. Pendências (não foi possível confirmar)

- **Se o mecanismo oficial de assinatura de webhook (header
  `Authorization`, via registro em `POST /v1/webhooks/{tipo}`) está
  configurado nesta conta** — `GET /v1/webhooks` retornou 500 durante a
  auditoria.
- **Se `POST /v1/card_payments/tokenize_card` é obrigatório** ou puramente
  opcional — a integração de origem nunca o chama, mas a documentação lista
  o endpoint separadamente.
- **Endpoints de consulta de status, captura, cancelamento e estorno de
  cartão** — não confirmados contra a API real, não documentados de forma
  clara nas páginas consultadas.
- **Endpoint de consulta de status de Pix** — tentativas durante o
  desenvolvimento original não retornaram nada utilizável.
- **Existência de ambiente de sandbox** — não encontrado.
- **Lista exata de IPs a liberar**, caso decidam ativar whitelist — depende
  de contato direto com o suporte da Zendry, não está em nenhuma
  documentação pública.
- **IP de saída real do ambiente de produção (Vercel)** — não é fixo por
  padrão; um IP específico observado durante esta auditoria (`170.238.49.145`)
  é só uma amostra do ambiente onde esta auditoria rodou, **não** o IP real
  das funções serverless do projeto em produção.

---

## 17. Segurança — pontos corrigidos/reforçados nesta versão

Comparado ao código do projeto de origem, os módulos entregues em
`zendry-migration/src/lib/zendry/`:

1. Consolidam a lógica de autenticação num único lugar (`client.ts`) — no
   projeto de origem, `zendry-provider.ts` e `card-payment.ts` cada um tinha
   sua própria cópia de `getZendryAccessToken()`.
2. Corrigem um bug real encontrado durante esta auditoria: a validação de
   parcelas em `card-payment.ts` estava capada em 12, mas a tela já oferecia
   até 14x — corrigido também no projeto de origem (commit separado).
3. Documentam explicitamente, em comentário no código, os dois mecanismos
   possíveis de autenticidade de webhook (o usado vs. o oficial), em vez de
   só implementar um sem explicar a lacuna.
4. Reforçam nos comentários, em todo ponto onde dados de cartão trafegam,
   que eles nunca devem ser logados/persistidos — mesmo aviso que já existia
   no projeto de origem, mantido.
