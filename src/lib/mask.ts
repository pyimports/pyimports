import { digitsOnly } from "@/lib/cpf";

// Mascaramento PARA EXIBIÇÃO (segurança/privacidade) — diferente de
// maskPhone/maskCpf em src/lib/utils.ts, que só formatam o valor digitado
// num input (sem esconder nada). Estes aqui sempre escondem a maior parte do
// dado real e nunca devem receber o valor de volta sem mascarar.

export function maskCpfDisplay(cpf: string | null | undefined): string | null {
  const digits = digitsOnly(cpf);
  if (digits.length !== 11) return null;
  return `***.***.***-${digits.slice(9)}`;
}

export function maskPhoneDisplay(phone: string | null | undefined): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return null;
  const last4 = digits.slice(-4);
  // Mantém o formato visual (DDD) ***** -1234 mesmo sem saber o tamanho exato
  // do número (fixo 10 ou celular 11 dígitos) — não precisamos do DDD real
  // pra fins de mascaramento, só do "formato reconhecível".
  return `(**) *****-${last4}`;
}

export function maskEmailDisplay(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "***";
  const [user, domain] = email.split("@");
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
}
