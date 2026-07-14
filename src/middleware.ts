import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Este middleware roda em TODA requisição às rotas /admin/*.
// Ele serve para dois propósitos:
//
// 1. RENOVAÇÃO AUTOMÁTICA DE TOKEN
//    O access_token do Supabase expira em 1h. Sem este middleware, o usuário
//    seria deslogado toda hora mesmo com "Lembrar-me" ativado. Aqui,
//    getUser() detecta o token expirado, usa o refresh_token para obter um
//    novo access_token e atualiza o cookie automaticamente.
//
// 2. PROTEÇÃO DE ROTA
//    Redireciona para /admin/login se não há sessão válida.
//    Redireciona para /admin/dashboard se já está logado e tenta acessar /login.

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagar cookies atualizados para request e response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida o token no servidor Supabase e renova se expirado.
  // NÃO use getSession() aqui — ele apenas lê o cookie sem validar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage  = pathname === "/admin/login";

  // Rota protegida sem sessão → redireciona para login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Já logado tentando acessar a página de login → redireciona para dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Aplica APENAS às rotas do admin; ignora assets estáticos e API routes.
  matcher: ["/admin/:path*"],
};
