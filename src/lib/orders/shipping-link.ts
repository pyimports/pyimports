import { createServiceClient } from "@/lib/supabase/server";
import { transitionOrderStatus } from "./transition";

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface ShippingPaymentLink {
  id: string;
  label: string;
  url: string;
  is_active: boolean;
}

interface OrderForRelease {
  id: string;
  status: string;
  payment_method: string;
  payment_confirmed_at: string | null;
}

export interface ShippingLinkRelease {
  status: "shipping_link_pending";
  shipping_payment_link: string;
}

// Janela de liberação do link de frete — regra fixa por dia da semana,
// igual pra Pix e Cartão (substituiu o esquema anterior de "delay em horas
// configurável + Pix instantâneo"). Domingo não tem janela nenhuma.
// América/Sao_Paulo não observa horário de verão desde 2019, então -03:00 é
// um offset fixo seguro aqui.
interface ReleaseWindow {
  startHour: number;
  endHour: number; // exclusivo — 16 significa "até 15:59"
}

const RELEASE_WINDOWS: Record<number, ReleaseWindow | null> = {
  0: null, // domingo — sem liberação
  1: { startHour: 9, endHour: 16 }, // segunda
  2: { startHour: 9, endHour: 16 }, // terça
  3: { startHour: 9, endHour: 16 }, // quarta
  4: { startHour: 9, endHour: 16 }, // quinta
  5: { startHour: 9, endHour: 16 }, // sexta
  6: { startHour: 8, endHour: 10 }, // sábado
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getSaoPauloWeekday(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(date);
  return WEEKDAY_INDEX[weekday];
}

function getSaoPauloHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const rawHour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  return { hour: rawHour === 24 ? 0 : rawHour, minute };
}

// Constrói um Date no dia (calendário São Paulo) de `date`, na hora exata
// informada — usado tanto pra achar o início da janela de hoje quanto de
// qualquer dia futuro (basta passar um `date` já deslocado pro dia certo).
export function snapToHourSaoPaulo(date: Date, hour: number): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:00:00-03:00`);
}

// `date` cai dentro da janela de liberação do dia (considerando o dia da
// semana em São Paulo)?
export function isWithinReleaseWindow(date: Date): boolean {
  const window = RELEASE_WINDOWS[getSaoPauloWeekday(date)];
  if (!window) return false;
  const { hour, minute } = getSaoPauloHourMinute(date);
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= window.startHour * 60 && totalMinutes < window.endHour * 60;
}

// Início da próxima janela de liberação a partir de `date` — se `date` já
// está dentro de uma janela, retorna o próprio `date` (libera na hora).
// Senão, procura o próximo dia (até 7 dias à frente, nunca deveria precisar
// de mais que 2 pra achar um dia útil) com janela cujo início ainda não
// passou.
export function nextReleaseWindowStart(date: Date): Date {
  if (isWithinReleaseWindow(date)) return date;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidateDay = new Date(date.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const window = RELEASE_WINDOWS[getSaoPauloWeekday(candidateDay)];
    if (!window) continue;

    const windowStart = snapToHourSaoPaulo(candidateDay, window.startHour);
    if (windowStart.getTime() > date.getTime()) return windowStart;
  }

  // Nunca deveria chegar aqui (segunda a sábado sempre tem janela) — devolve
  // `date` como fallback seguro em vez de travar.
  return date;
}

// Sem cron: a liberação do link de frete é calculada sob demanda, chamada em
// toda leitura de pedido (tracking público em order-lookup.ts, admin em
// db/orders.ts). Se o pagamento foi confirmado dentro do expediente (ver
// RELEASE_WINDOWS), libera na hora; senão, só libera quando a próxima janela
// abrir. Mesma regra pra Pix e Cartão. Sorteia um link ativo, grava no
// pedido (fixo — não resorteia depois) e transiciona o status. Retorna o que
// mudou (para o chamador atualizar a linha já carregada em memória, sem
// precisar de uma segunda query) ou `null` se nada mudou.
export async function maybeReleaseShippingLink(
  service: ServiceClient,
  order: OrderForRelease,
  options: { force?: boolean } = {}
): Promise<ShippingLinkRelease | null> {
  if (order.status !== "payment_confirmed" || !order.payment_confirmed_at) return null;

  const { data: settings } = await service
    .from("store_settings_private")
    .select("shipping_payment_links")
    .eq("lock", true)
    .single();

  if (!settings) return null;

  if (!options.force) {
    const releaseAt = nextReleaseWindowStart(new Date(order.payment_confirmed_at)).getTime();
    if (Date.now() < releaseAt) return null;
  }

  const links = (settings.shipping_payment_links as ShippingPaymentLink[] | null) ?? [];
  const activeLinks = links.filter((l) => l.is_active && l.url);
  // Nenhum link ativo cadastrado — não bloqueia o pedido, só ainda não libera.
  if (activeLinks.length === 0) return null;

  const chosen = activeLinks[Math.floor(Math.random() * activeLinks.length)];

  const { error: updateError } = await service
    .from("orders")
    .update({ shipping_payment_link: chosen.url })
    .eq("id", order.id);
  if (updateError) return null;

  const { error: transitionError } = await transitionOrderStatus(
    service,
    order.id,
    "shipping_link_pending",
    "system",
    "Link de frete liberado automaticamente"
  );
  if (transitionError) return null;

  return { status: "shipping_link_pending", shipping_payment_link: chosen.url };
}

const LABEL_CONFIRMATION_WINDOW_HOURS = 0.5; // 30 minutos

interface OrderForAutoComplete {
  id: string;
  status: string;
  label_issued_at: string | null;
}

export interface AutoCompleteResult {
  status: "completed";
}

// Mesmo padrão sem cron do release do link acima: se o admin emitiu a
// etiqueta e o cliente não confirmou em 30min, o pedido avança sozinho pra
// "Pedido Finalizado" na próxima vez que alguém ler esse pedido (tracking
// público ou admin) — não trava o fluxo esperando uma ação do cliente.
export async function maybeAutoCompleteOrder(
  service: ServiceClient,
  order: OrderForAutoComplete
): Promise<AutoCompleteResult | null> {
  if (order.status !== "label_issued" || !order.label_issued_at) return null;

  const deadline = new Date(order.label_issued_at).getTime() + LABEL_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000;
  if (Date.now() < deadline) return null;

  const { error: transitionError } = await transitionOrderStatus(
    service,
    order.id,
    "completed",
    "system",
    "Cliente não confirmou a etiqueta em 30min — pedido finalizado automaticamente"
  );
  if (transitionError) return null;

  return { status: "completed" };
}
