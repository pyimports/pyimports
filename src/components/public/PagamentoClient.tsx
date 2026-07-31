"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, CheckCircle2, MessageCircle, Clock, Loader2, ExternalLink, ShieldCheck, CreditCard } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { routes } from "@/lib/routes";
import { formatCurrency } from "@/lib/formatters";
import { generateStoreWhatsAppLink } from "@/lib/whatsapp";
import { maskCpf } from "@/lib/utils";
import { payWithCard } from "@/lib/actions/card-payment";

interface PagamentoClientProps {
  orderId: string;
  orderNumber: string;
  total: number;
  pixCode: string | null;
  pixQrUrl: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  isStub: boolean;
  whatsappNumber?: string;
}

function maskCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function maskExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

const INSTALLMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: i === 0 ? "1x (à vista)" : `${i + 1}x`,
}));

// A API do Zendry recusa qualquer pagamento de cartão sem 3DS ("Threeds
// data is required") — confirmado testando de verdade. O formulário de
// cartão já está pronto (src/lib/actions/card-payment.ts), mas fica
// escondido da tela até o SDK de 3DS ser implementado, pra não oferecer uma
// opção que sempre vai falhar pro cliente.
const CARD_PAYMENT_ENABLED = false;

export function PagamentoClient({
  orderId,
  orderNumber,
  total,
  pixCode,
  pixQrUrl,
  checkoutUrl,
  expiresAt,
  isStub,
  whatsappNumber,
}: PagamentoClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const hasPix = !!(pixQrUrl || pixCode);
  const [activeTab, setActiveTab] = useState<"pix" | "card">("pix");

  const initialSeconds = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 15 * 60;
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  const handleCopy = () => {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirm = async () => {
    setConfirmError("");
    setConfirming(true);
    try {
      const res = await fetch("/api/payments/dev-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setConfirmError(json.error ?? "Erro ao confirmar pagamento.");
        setConfirming(false);
        return;
      }
      router.push(routes.pedidoConfirmado(orderId));
    } catch {
      setConfirmError("Erro ao confirmar pagamento.");
      setConfirming(false);
    }
  };

  // ── Formulário de cartão ──────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderDocument, setCardHolderDocument] = useState("");
  const [installments, setInstallments] = useState("1");
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardError, setCardError] = useState("");

  const handlePayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError("");
    setCardSubmitting(true);

    const [mm, yy] = cardExpiry.split("/");
    const cardExpirationDate = mm && yy?.length === 2 ? `${mm}20${yy}` : "";

    const result = await payWithCard({
      orderId,
      cardNumber,
      cardExpirationDate,
      cardSecurityCode: cardCvv,
      cardHolderName,
      cardHolderDocument,
      installments: Number(installments),
    });

    setCardSubmitting(false);

    if ("error" in result) {
      setCardError(result.error);
      return;
    }

    router.push(routes.pedidoConfirmado(orderId));
  };

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="mb-8">
          <CheckoutSteps currentStep={3} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark-text mb-2">Finalize seu pagamento</h1>
          <p className="text-muted">
            Pedido #{orderNumber} · Total: <span className="text-accent font-bold">{formatCurrency(total)}</span>
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-warning/5 border border-warning/20 rounded-xl">
          <Clock size={16} className="text-warning" />
          <span className="text-sm text-warning font-medium">
            Pague em {mins}:{secs} antes do link expirar
          </span>
        </div>

        {hasPix ? (
          <>
            {/* Seletor Pix / Cartão — cartão só aparece quando CARD_PAYMENT_ENABLED */}
            {CARD_PAYMENT_ENABLED && (
              <div className="flex gap-2 bg-dark-alt rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab("pix")}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    activeTab === "pix" ? "bg-dark-surface text-dark-text shadow-sm" : "text-muted hover:text-dark-text",
                  ].join(" ")}
                >
                  Pix
                </button>
                <button
                  onClick={() => setActiveTab("card")}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                    activeTab === "card" ? "bg-dark-surface text-dark-text shadow-sm" : "text-muted hover:text-dark-text",
                  ].join(" ")}
                >
                  <CreditCard size={15} />
                  Cartão
                </button>
              </div>
            )}

            {activeTab === "pix" || !CARD_PAYMENT_ENABLED ? (
              <>
                {/* QR Code */}
                {pixQrUrl && (
                  <div className="flex flex-col items-center gap-6 p-8 bg-dark-surface rounded-2xl border border-dark-border mb-6">
                    <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pixQrUrl} alt="QR Code Pix" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm text-muted text-center">Escaneie o QR Code com o app do seu banco</p>
                  </div>
                )}

                {/* Código Pix */}
                {pixCode && (
                  <div className="space-y-3 mb-8">
                    <p className="text-sm font-medium text-dark-text">Ou copie o código:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-dark-alt rounded-xl px-3 py-2.5 text-xs text-muted font-mono truncate border border-dark-border">
                        {pixCode}
                      </code>
                      <Button variant="accent" size="sm" onClick={handleCopy} leftIcon={copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}>
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-3 mb-6">
                  <h3 className="text-sm font-bold text-dark-text">Como pagar:</h3>
                  {[
                    "Abra o app do seu banco",
                    "Escaneie o QR Code ou cole o código copiado",
                    "Confirme o pagamento",
                    "Aguarde a confirmação do pagamento",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted">
                      <div className="w-5 h-5 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handlePayWithCard} className="bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-4 mb-6">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck size={14} className="text-accent" />
                  Pagamento processado com segurança
                </div>
                <Input
                  label="Número do cartão"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Validade (MM/AA)"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                    placeholder="MM/AA"
                    inputMode="numeric"
                    maxLength={5}
                    required
                  />
                  <Input
                    label="CVV"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="000"
                    inputMode="numeric"
                    maxLength={4}
                    required
                  />
                </div>
                <Input
                  label="Nome impresso no cartão"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                  placeholder="Como está no cartão"
                  required
                />
                <Input
                  label="CPF do titular do cartão"
                  value={cardHolderDocument}
                  onChange={(e) => setCardHolderDocument(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                <Select
                  label="Parcelas"
                  value={installments}
                  onChange={setInstallments}
                  options={INSTALLMENT_OPTIONS}
                />

                {cardError && <p className="text-sm text-danger">{cardError}</p>}

                <Button type="submit" variant="accent" fullWidth size="lg" isLoading={cardSubmitting}>
                  Pagar {formatCurrency(total)}
                </Button>
              </form>
            )}
          </>
        ) : (
          checkoutUrl && (
            <div className="flex flex-col items-center gap-6 p-8 bg-dark-surface rounded-2xl border border-dark-border mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <ShieldCheck size={28} className="text-accent" />
              </div>
              <p className="text-sm text-muted text-center max-w-sm">
                Você será levado a uma página segura para escolher entre Pix ou cartão e concluir o pagamento.
              </p>
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button variant="accent" fullWidth size="lg" leftIcon={<ExternalLink size={16} />}>
                  Finalizar pagamento
                </Button>
              </a>
            </div>
          )
        )}

        {confirmError && (
          <p className="text-sm text-danger text-center mb-4">{confirmError}</p>
        )}

        <div className="flex flex-col gap-3">
          <a href={`${generateStoreWhatsAppLink(whatsappNumber)}?text=Preciso+de+ajuda+com+o+pagamento+do+pedido+${orderNumber}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" fullWidth leftIcon={<MessageCircle size={16} />}>
              Preciso de ajuda — WhatsApp
            </Button>
          </a>
          {isStub ? (
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              onClick={handleConfirm}
              isLoading={confirming}
              leftIcon={!confirming ? <Loader2 size={14} /> : undefined}
            >
              Já realizei o pagamento (simular confirmação)
            </Button>
          ) : (
            <p className="text-xs text-muted text-center">
              A confirmação é automática — assim que o pagamento for aprovado, você verá a atualização aqui.
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
