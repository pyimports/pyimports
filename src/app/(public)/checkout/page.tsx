"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, QrCode, CreditCard } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { formatCurrency } from "@/lib/formatters";
import { maskPhone, maskCpf } from "@/lib/utils";
import { isValidCpf } from "@/lib/cpf";
import { useCartStore } from "@/store/cart-store";
import { createOrder } from "@/lib/actions/checkout";

export default function CheckoutPage() {
  const router = useRouter();

  const {
    items,
    getSubtotal,
    getCouponDiscount,
    getInsuranceValue,
    getTotalPix,
    coupon_code,
    insurance_enabled,
    clearCart,
  } = useCartStore();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [cpf,          setCpf]          = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "">("");

  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  const subtotal  = getSubtotal();
  const discount  = getCouponDiscount();
  const insurance = getInsuranceValue();
  const total     = getTotalPix();

  // Botão "Finalizar pedido" só libera com tudo preenchido — nada de
  // deixar clicar e só mostrar erro depois.
  const isFormValid =
    !!name.trim() &&
    isValidCpf(cpf) &&
    !!email.trim() &&
    !!phone.trim() &&
    paymentMethod !== "" &&
    items.length > 0;

  const handleSubmit = async () => {
    setSubmitError("");

    // Validação server-side já cobre tudo isso de novo — esta é só a
    // camada rápida do client, o botão já vem desabilitado sem isFormValid.
    if (!name.trim())         { setSubmitError("Nome é obrigatório.");        return; }
    if (!cpf.trim())          { setSubmitError("CPF é obrigatório.");         return; }
    if (!isValidCpf(cpf))     { setSubmitError("CPF inválido.");              return; }
    if (!email.trim())        { setSubmitError("E-mail é obrigatório.");      return; }
    if (!phone.trim())        { setSubmitError("Telefone é obrigatório.");    return; }
    if (!paymentMethod)       { setSubmitError("Escolha a forma de pagamento."); return; }
    if (items.length === 0)   { setSubmitError("Seu carrinho está vazio.");   return; }

    setSubmitting(true);

    const result = await createOrder({
      name,
      email,
      phone,
      cpf,
      items: items.map((i) => ({
        product_id: i.product_id,
        variant_size_id: i.variant_size_id,
        quantity: i.quantity,
      })),
      coupon_code:        coupon_code ?? undefined,
      insurance_enabled,
      payment_method:     paymentMethod,
    });

    setSubmitting(false);

    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }

    // Pedido criado com sucesso — limpa o carrinho, senão os mesmos itens
    // continuam aparecendo pro cliente depois (bug real relatado: item
    // "fantasma" ficava no carrinho mesmo após finalizar o pedido).
    clearCart();
    router.push(`/pagamento/${result.orderId}?method=${paymentMethod}`);
  };

  return (
    <div className="py-12">
      <Container>
        <div className="mb-8">
          <CheckoutSteps currentStep={2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal data */}
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-4">
              <h2 className="text-base font-bold text-dark-text">Dados pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
                <Input label="CPF" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} required />
                <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                <Input label="Telefone / WhatsApp" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} required />
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-3">
              <h2 className="text-base font-bold text-dark-text">
                Forma de pagamento <span className="text-danger">*</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={[
                    "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                    paymentMethod === "pix"
                      ? "border-accent bg-accent/10"
                      : "border-dark-border hover:border-accent/40",
                  ].join(" ")}
                >
                  <QrCode size={20} className={paymentMethod === "pix" ? "text-accent" : "text-muted"} />
                  <div>
                    <p className="text-sm font-semibold text-dark-text">Pix</p>
                    <p className="text-xs text-muted">Aprovação automática</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={[
                    "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                    paymentMethod === "card"
                      ? "border-accent bg-accent/10"
                      : "border-dark-border hover:border-accent/40",
                  ].join(" ")}
                >
                  <CreditCard size={20} className={paymentMethod === "card" ? "text-accent" : "text-muted"} />
                  <div>
                    <p className="text-sm font-semibold text-dark-text">Cartão de crédito</p>
                    <p className="text-xs text-muted">Em até 14x, sem sair do site</p>
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Summary */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-dark-text">Resumo do pedido</h2>
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-3 sticky top-24">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-dark-text">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Cupom {coupon_code && `(${coupon_code})`}</span>
                  <span className="text-success">-{formatCurrency(discount)}</span>
                </div>
              )}
              {insurance_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Seguro da mercadoria</span>
                  <span className={insurance > 0 ? "text-dark-text" : "text-success font-semibold"}>
                    {insurance > 0 ? formatCurrency(insurance) : "Grátis"}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Frete</span>
                <span className="text-dark-text">A combinar</span>
              </div>
              <div className="border-t border-dark-border pt-3">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-dark-text">Total a pagar</span>
                  <span className="text-lg font-bold text-accent">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Erro de submit */}
              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-xl">
                  <AlertCircle size={15} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger">{submitError}</p>
                </div>
              )}

              <Button
                variant="accent"
                fullWidth
                size="lg"
                isLoading={submitting}
                disabled={!isFormValid}
                onClick={handleSubmit}
              >
                Finalizar pedido
              </Button>
              <p className="text-xs text-center text-muted">
                Você receberá as instruções de pagamento após confirmar
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
