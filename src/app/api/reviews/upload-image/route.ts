import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = "customer-review-images";

// POST /api/reviews/upload-image — sobe uma foto da avaliação do cliente
// (sem autenticação: rota pública, mesma bucket/limite do upload de reviews
// do admin). O envio final da avaliação (submitCustomerReview) revalida CPF
// e pedido — esta rota só valida tipo/tamanho do arquivo.
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Tipo não permitido. Use JPEG, PNG ou WEBP." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo: 5 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(name, new Uint8Array(bytes), { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET).getPublicUrl(name);

  return NextResponse.json({ url: publicUrl });
}
