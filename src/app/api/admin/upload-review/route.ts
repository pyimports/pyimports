import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = "reviews";

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  return profile ? user : null;
}

// POST /api/admin/upload-review — sobe imagem para reviews/{name}
export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Campo obrigatório: file" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo não permitido. Use JPEG, PNG ou WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande. Máximo: 5 MB." },
      { status: 400 }
    );
  }

  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes   = await file.arrayBuffer();
  const service = createServiceClient();

  // Garante que o bucket existe (cria se não existir)
  const { data: buckets } = await service.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await service.storage.createBucket(BUCKET, { public: true });
  }

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(name, new Uint8Array(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(name);

  return NextResponse.json({ url: publicUrl, storagePath: name });
}

// DELETE /api/admin/upload-review?path=xxx — remove imagem do bucket
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const storagePath = request.nextUrl.searchParams.get("path");
  if (!storagePath) {
    return NextResponse.json({ error: "path é obrigatório" }, { status: 400 });
  }

  if (storagePath.includes("..")) {
    return NextResponse.json({ error: "path inválido" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
