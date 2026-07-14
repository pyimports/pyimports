// Clientes Supabase para uso no servidor (Server Components, Route Handlers, Server Actions)
// NUNCA importar em componentes com "use client"

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// createClient — cliente autenticado para Server Components e Route Handlers
// Respeita RLS com base no usuário autenticado via cookie de sessão
// ---------------------------------------------------------------------------

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar em Server Components — cookies não podem ser definidos
          }
        },
      },
    }
  );
}

// ---------------------------------------------------------------------------
// createServiceClient — cliente com service role (bypassa RLS)
// Usar EXCLUSIVAMENTE em Route Handlers e Server Actions protegidos
// NUNCA chamar a partir de código que responda a requisições públicas
// ---------------------------------------------------------------------------

export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
      },
    }
  );
}
