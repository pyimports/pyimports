import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Package, MessageCircle, ArrowRight, MapPin } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { routes } from "@/lib/routes";
import { getOrderByIdAdmin } from "@/lib/db/orders";
import { getPublicStoreSettings } from "@/lib/db/settings";
import { generateOrderWhatsAppLink, generateStoreWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Pedido confirmado" };

export default async function PedidoConfirmadoPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const settings = await getPublicStoreSettings();

  let whatsappLink = generateStoreWhatsAppLink(settings.whatsapp_number, settings.whatsapp_default_message);
  try {
    const order = await getOrderByIdAdmin(orderId);
    if (order) {
      whatsappLink = generateOrderWhatsAppLink({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        items: (order.items ?? []).map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price_pix,
        })),
        total: order.total,
        storePhone: settings.whatsapp_number,
      });
    }
  } catch {
    // mantém fallback genérico se a busca do pedido falhar
  }

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="mb-10">
          <CheckoutSteps currentStep={4} />
        </div>

        {/* Success */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-dark-text mb-3">
            Pedido confirmado!
          </h1>
          <p className="text-muted">
            Seu pedido foi recebido e será processado em breve.
          </p>
          <div className="inline-block mt-3 px-4 py-1.5 bg-dark-surface border border-dark-border rounded-full">
            <span className="text-sm text-muted">Pedido </span>
            <span className="text-sm font-bold font-mono text-dark-text">#{orderId}</span>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 mb-6 space-y-4">
          <h2 className="text-sm font-bold text-dark-text">Próximos passos:</h2>
          {[
            { icon: CheckCircle2, text: "Confirmação de pagamento — você receberá uma notificação por WhatsApp", color: "text-success" },
            { icon: Package, text: "Separação e embalagem — geralmente em 1-2 dias úteis após o pagamento", color: "text-info" },
            { icon: MapPin, text: "Envio e rastreamento — você receberá o código de rastreio via WhatsApp", color: "text-accent" },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <step.icon size={18} className={`${step.color} flex-shrink-0 mt-0.5`} />
              <p className="text-sm text-muted">{step.text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href={routes.acompanharPedido}>
            <Button variant="accent" fullWidth rightIcon={<ArrowRight size={16} />}>
              Acompanhar meu pedido
            </Button>
          </Link>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" fullWidth leftIcon={<MessageCircle size={16} />}>
              Falar no WhatsApp
            </Button>
          </a>
          <Link href={routes.home}>
            <Button variant="ghost" fullWidth size="sm">
              Voltar à loja
            </Button>
          </Link>
        </div>

      </Container>
    </div>
  );
}
