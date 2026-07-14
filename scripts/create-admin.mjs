// Cria um usuário admin: Supabase Auth (e-mail/senha) + linha em admin_profiles.
// Uso: node scripts/create-admin.mjs <email> <senha> [nome]
// Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY de .env.local —
// nunca passe a service role key como argumento de linha de comando.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Uso: node scripts/create-admin.mjs <email> <senha> [nome]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não encontradas em .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error(`Erro ao criar usuário no Auth: ${createError.message}`);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("admin_profiles").insert({
    id: created.user.id,
    email,
    name: name ?? "Admin",
    role: "owner",
  });

  if (profileError) {
    console.error(`Usuário criado no Auth, mas falhou ao inserir em admin_profiles: ${profileError.message}`);
    process.exit(1);
  }

  console.log(`Admin criado com sucesso: ${email} (id: ${created.user.id})`);
}

main();
