// Utilitário para merge de classes (sem dependência extra)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes
    .filter(Boolean)
    .join(" ")
    .trim();
}

// Delay
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gerar código de cupom aleatório
export const generateCouponCode = (prefix = ""): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return prefix ? `${prefix.toUpperCase()}${random}` : random;
};

// Calcular desconto de cupom
export const calculateCouponDiscount = (
  type: "percentage" | "fixed" | "free_shipping",
  value: number,
  subtotal: number,
  shippingValue: number
): number => {
  if (type === "percentage") return (subtotal * value) / 100;
  if (type === "fixed") return Math.min(value, subtotal);
  if (type === "free_shipping") return shippingValue;
  return 0;
};

// Verificar se é mobile (client-side)
export const isMobile = () =>
  typeof window !== "undefined" && window.innerWidth < 768;

// Mascaras de input
export const maskCep = (value: string): string => {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (clean.length > 5) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return clean;
};

export const maskPhone = (value: string): string => {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length > 10)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length > 6)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  if (clean.length > 2) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return clean;
};

export const maskCpf = (value: string): string => {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length > 9)
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  if (clean.length > 6)
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  if (clean.length > 3) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  return clean;
};

// Truncate texto
export const truncate = (text: string, length: number): string =>
  text.length > length ? `${text.slice(0, length)}...` : text;

// Plural simples
export const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;
