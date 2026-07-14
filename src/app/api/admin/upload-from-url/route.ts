import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10000;
const BUCKET = "product-images";

// ---------------------------------------------------------------------------
// Guard — requer sessão admin válida (mesmo padrão de /api/admin/upload)
// ---------------------------------------------------------------------------

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  return profile ? user : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Busca a URL com um User-Agent de navegador comum — vários sites (Pinterest,
// Instagram, etc.) bloqueiam requisições sem isso. Timeout evita pendurar a
// requisição esperando um host lento/indisponível.
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/*,text/html;q=0.8,*/*;q=0.5",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Quando o link arrastado é a página de um post (ex: pin do Pinterest) em vez
// da imagem direta, tenta achar a imagem real via <meta property="og:image">.
function extractOgImage(html: string): string | undefined {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1];
}

// ---------------------------------------------------------------------------
// POST /api/admin/upload-from-url — baixa uma imagem a partir de uma URL
// (arrastada de outra aba/site) e sobe pro mesmo bucket do upload normal.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { url?: string; productId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { url, productId } = body;

  if (!url || !productId) {
    return NextResponse.json({ error: "Campos obrigatórios: url, productId" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: "productId inválido" }, { status: 400 });
  }
  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch {
    return NextResponse.json({ error: "Não consegui acessar esse link." }, { status: 400 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Não consegui baixar essa imagem." }, { status: 400 });
  }

  let contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";

  // O link arrastado é de uma página (não da imagem em si) — tenta achar a
  // imagem real dentro do HTML (og:image) e refaz a busca com ela.
  if (contentType === "text/html") {
    const html = await res.text();
    const ogImage = extractOgImage(html);
    if (!ogImage) {
      return NextResponse.json(
        { error: "Esse link não é de uma imagem direta. Tente salvar a imagem e enviar o arquivo." },
        { status: 400 }
      );
    }
    try {
      res = await fetchWithTimeout(ogImage);
    } catch {
      return NextResponse.json({ error: "Não consegui acessar a imagem desse link." }, { status: 400 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Não consegui baixar essa imagem." }, { status: 400 });
    }
    contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
  }

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "O link não aponta para uma imagem JPEG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Imagem muito grande. Máximo: 5 MB." }, { status: 400 });
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Imagem muito grande. Máximo: 5 MB." }, { status: 400 });
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${productId}/${uniqueName}`;

  const service = createServiceClient();
  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl, storagePath });
}
