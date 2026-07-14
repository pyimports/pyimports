// Valida se as variáveis de ambiente do Supabase estão configuradas
// Usado para decidir entre dados reais e fallback de mocks em desenvolvimento
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("SEU_PROJECT_ID") &&
    (key.startsWith("sb_publishable_") || key.startsWith("eyJ")) &&
    key.length > 50
  );
}

export function assertServiceRoleConfigured(): void {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. " +
        "Operações com service role só podem ser executadas no servidor com credenciais reais."
    );
  }
}
