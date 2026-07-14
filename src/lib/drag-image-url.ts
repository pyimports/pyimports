// Extrai a URL de uma imagem arrastada de outra aba/site (ex: Pinterest,
// Google Imagens) — nesses casos o navegador nunca entrega um File real em
// dataTransfer.files, só o link por trás da imagem, em um destes formatos.
export function extractDroppedImageUrl(dataTransfer: DataTransfer): string | undefined {
  const uriList = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain");
  const fromList = uriList
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  if (fromList) return fromList;

  const html = dataTransfer.getData("text/html");
  const match = html?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}
