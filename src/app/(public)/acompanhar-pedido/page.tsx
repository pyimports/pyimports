import type { Metadata } from "next";
import AcompanharPedidoClient from "./AcompanharPedidoClient";
import { getPublicStoreSettings } from "@/lib/db/settings";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  description: "Localize sua compra pelo número do pedido, CPF ou e-mail.",
};

export default async function AcompanharPedidoPage() {
  const settings = await getPublicStoreSettings();
  return (
    <AcompanharPedidoClient
      whatsappNumber={settings.whatsapp_number}
      whatsappMessage={settings.whatsapp_default_message}
    />
  );
}
