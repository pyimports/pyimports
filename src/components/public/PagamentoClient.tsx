"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, CheckCircle2, MessageCircle, Clock, QrCode, Loader2, ExternalLink } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { routes } from "@/lib/routes";
import { formatCurrency } from "@/lib/formatters";
import { generateStoreWhatsAppLink } from "@/lib/whatsapp";

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

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="mb-8">
          <CheckoutSteps currentStep={3} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark-text mb-2">Pague com PicPay</h1>
          <p className="text-muted">
            Pedido #{orderNumber} · Total: <span className="text-accent font-bold">{formatCurrency(total)}</span>
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-warning/5 border border-warning/20 rounded-xl">
          <Clock size={16} className="text-warning" />
          <span className="text-sm text-warning font-medium">
            Pague em {mins}:{secs} antes do código expirar
          </span>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-6 p-8 bg-dark-surface rounded-2xl border border-dark-border mb-6">
          <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
            {pixQrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pixQrUrl} alt="QR Code PicPay" className="w-full h-full object-contain" />
            ) : (
              <QrCode size={120} className="text-dark-bg" />
            )}
          </div>
          <p className="text-sm text-muted text-center">Escaneie o QR Code com o app do PicPay</p>
        </div>

        {checkoutUrl && (
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="block mb-6">
            <Button variant="accent" fullWidth leftIcon={<ExternalLink size={16} />}>
              Abrir no app do PicPay
            </Button>
          </a>
        )}

        {/* Código PicPay */}
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
            "Abra o app do PicPay (ou toque em \"Abrir no app do PicPay\" acima)",
            "Escaneie o QR Code ou cole o código copiado",
            "Confirme o pagamento no app",
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
