export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

// Validação real do CPF (dígitos verificadores) — usada antes de consultar o
// banco na busca pública, pra rejeitar entrada claramente inválida sem
// precisar de nenhuma query (e sem revelar se aquele CPF existe ou não).
export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += parseInt(cpf[i], 10) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheckDigit(9) === parseInt(cpf[9], 10) && calcCheckDigit(10) === parseInt(cpf[10], 10);
}
