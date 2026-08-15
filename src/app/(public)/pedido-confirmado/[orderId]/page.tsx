import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MessageCircle, ArrowRight, LinkIcon, Tag } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { routes } from "@/lib/routes";
import { formatCurrency } from "@/lib/formatters";
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
  let orderNumber: string | null = null;
  let orderTotal: number | null = null;
  try {
    const order = await getOrderByIdAdmin(orderId);
    if (order) {
      orderNumber = order.order_number;
      orderTotal = order.total;
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
            Pagamento recebido — seu pedido já está com a gente.
          </p>
        </div>

        {/* Número do pedido + total pago */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Número do pedido</p>
            <p className="text-lg font-bold font-mono text-dark-text">#{orderNumber ?? orderId}</p>
          </div>
          {orderTotal !== null && (
            <div className="text-right">
              <p className="text-xs text-muted uppercase tracking-wider">Total pago</p>
              <p className="text-lg font-bold text-accent">{formatCurrency(orderTotal)}</p>
            </div>
          )}
        </div>

        {/* Next steps */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 mb-6 space-y-4">
          <h2 className="text-sm font-bold text-dark-text">Próximos passos:</h2>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted">Pagamento confirmado — já processamos a baixa do seu pedido.</p>
          </div>
          <div className="flex items-start gap-3">
            <LinkIcon size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              Link de pagamento do frete — liberado direto na página{" "}
              <Link href={routes.acompanharPedido} className="text-accent font-medium underline underline-offset-2 hover:text-accent-light">
                Acompanhar Pedido
              </Link>
              .
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Tag size={18} className="text-info flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              Após pagar o frete e confirmar, emitimos a etiqueta e seu pedido segue para postagem.
            </p>
          </div>
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
