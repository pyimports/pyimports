"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database.types";

// Quando rememberMe = false, os cookies de sessão do Supabase são criados SEM
// maxAge/expires → tornam-se cookies de sessão do navegador (limpos ao fechar).
// Quando rememberMe = true, mantemos o comportamento padrão do Supabase (cookie
// persistente com validade longa).
// A senha NUNCA é salva em lugar nenhum — apenas o token de sessão gerenciado
// pelo próprio Supabase.
export async function loginAdmin(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ error: string } | never> {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = rememberMe
                ? options
                : { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, opts);
            });
          } catch {
            // Ignorar em Server Components — cookies já foram enviados
          }
        },
      },
    }
  );

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: "E-mail ou senha inválidos." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Erro ao verificar sessão." };
  }

  // Verifica se o usuário tem perfil de admin
  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Acesso não autorizado." };
  }

  redirect("/admin/dashboard");
}

export async function logoutAdmin(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Reautentica com a senha atual antes de trocar — evita que uma sessão
// aberta sem o admin por perto troque a senha sem confirmar a atual. A nova
// senha nunca é salva em lugar nenhum além do próprio Supabase Auth.
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Não autorizado" };

  if (newPassword.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Senha atual incorreta." };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: updateError.message };

  return {};
}
