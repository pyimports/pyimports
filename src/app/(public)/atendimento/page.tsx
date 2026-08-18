import type { Metadata } from "next";
import { MessageCircle, HelpCircle } from "lucide-react";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { FaqItem } from "@/components/public/FaqItem";
import { getPublicStoreSettings } from "@/lib/db/settings";
import { generateStoreWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Atendimento" };

export default async function AtendimentoPage() {
  const settings = await getPublicStoreSettings();
  const whatsappLink = generateStoreWhatsAppLink(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <HelpCircle size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-dark-text mb-2">Atendimento</h1>
          <p className="text-muted max-w-md mx-auto">
            Como funciona a compra, o pagamento e o envio — as dúvidas mais comuns, respondidas
            aqui embaixo.
          </p>
        </div>

        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block mb-10">
          <Button variant="accent" fullWidth size="lg" leftIcon={<MessageCircle size={18} />}>
            Falar direto no WhatsApp
          </Button>
        </a>

        <div className="space-y-3">
          <FaqItem question="Como funciona a compra?" defaultOpen>
            <p>
              Escolha os produtos, adicione ao carrinho e finalize o pedido. Na tela de pagamento
              você escolhe entre <strong className="text-dark-text">Pix</strong> (aprovação
              automática, em segundos) ou <strong className="text-dark-text">cartão de crédito</strong>{" "}
              (em até 14x), sem sair do nosso site em nenhum momento.
            </p>
          </FaqItem>

          <FaqItem question="Quais as formas de pagamento?">
            <p>
              Pix e cartão de crédito, direto na nossa página — nunca redirecionamos você pra
              outro site pra pagar. O Pix confirma na hora; o cartão passa por uma verificação de
              segurança adicional (3DS) antes de aprovar.
            </p>
          </FaqItem>

          <FaqItem question="Como funciona o envio dos produtos?">
            <p>
              Enviamos pela <strong className="text-dark-text">Shopee</strong> pra todo o Brasil,
              de forma discreta. O frete é um valor fixo de{" "}
              <strong className="text-dark-text">R$ 50,00</strong>, pago à parte, depois da
              confirmação do pagamento do produto.
            </p>
          </FaqItem>

          <FaqItem question="Quando eu pago o frete?">
            <p>
              Assim que confirmamos o pagamento do seu produto, liberamos automaticamente um link
              de pagamento do frete na página{" "}
              <strong className="text-dark-text">&quot;Acompanhar Pedido&quot;</strong> — dentro do nosso
              horário de expedição:
            </p>
            <ul className="list-disc list-inside space-y-0.5 pt-1">
              <li>Segunda a sexta: 9h às 16h</li>
              <li>Sábado: 8h às 10h</li>
              <li>Domingo: sem expedição</li>
            </ul>
            <p className="pt-1">
              Se o pagamento cair fora desse horário, o link libera assim que abrir o próximo
              expediente — sem precisar fazer nada, é automático.
            </p>
          </FaqItem>

          <FaqItem question="Como confirmo o pagamento do frete?">
            <p>
              Depois de pagar o link, volte na página &quot;Acompanhar Pedido&quot; e informe o{" "}
              <strong className="text-dark-text">nome completo</strong> usado na conta da Shopee e
              o <strong className="text-dark-text">ID do pedido</strong> gerado por lá (a própria
              tela ensina onde encontrar esse ID). Confirmando isso, seguimos com a separação e o
              envio.
            </p>
          </FaqItem>

          <FaqItem question="Como acompanho meu pedido?">
            <p>
              No menu <strong className="text-dark-text">&quot;Acompanhar Pedido&quot;</strong>, informe o
              CPF usado na compra — sem precisar de login nem senha. A página mostra todos os seus
              pedidos e atualiza sozinha conforme o status muda.
            </p>
          </FaqItem>

          <FaqItem question="O que é o seguro da mercadoria?">
            <p>
              É opcional, custa 8% do valor da compra. Se o pacote tiver qualquer problema ou se
              extraviar no caminho, reenviamos a mercadoria sem nenhum custo extra pra você. Pode
              ativar ou desativar direto no carrinho.
            </p>
          </FaqItem>

          <FaqItem question="Tenho prazo pra confirmar o recebimento da etiqueta?">
            <p>
              Sim, 30 minutos depois de emitirmos a etiqueta de envio. Se não conseguir confirmar
              a tempo, não se preocupe — o pedido segue pro envio normalmente mesmo assim, o prazo
              é só uma transparência, não trava nada.
            </p>
          </FaqItem>

          <FaqItem question="A entrega é discreta?">
            <p>
              Sim, sempre. As embalagens não têm nenhuma identificação do conteúdo por fora.
            </p>
          </FaqItem>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted mb-4">Não achou o que precisava?</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" leftIcon={<MessageCircle size={16} />}>
              Falar no WhatsApp
            </Button>
          </a>
        </div>
      </Container>
    </div>
  );
}
