import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

// A home (rota "/") já mostra o catálogo completo — esta rota existe só para
// não quebrar links/favoritos antigos para "/produtos".
export default function TodosProdutosPage() {
  redirect(routes.home);
}
