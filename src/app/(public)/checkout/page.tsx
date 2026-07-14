"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { CheckoutSteps } from "@/components/public/CheckoutSteps";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { formatCurrency } from "@/lib/formatters";
import { maskPhone, maskCpf } from "@/lib/utils";
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
  } = useCartStore();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [cpf,          setCpf]          = useState("");

  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  const subtotal  = getSubtotal();
  const discount  = getCouponDiscount();
  const insurance = getInsuranceValue();
  const total     = getTotalPix();

  const handleSubmit = async () => {
    setSubmitError("");

    // Validação client-side rápida
    if (!name.trim())         { setSubmitError("Nome é obrigatório.");        return; }
    if (!email.trim())        { setSubmitError("E-mail é obrigatório.");      return; }
    if (!phone.trim())        { setSubmitError("Telefone é obrigatório.");    return; }
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
    });

    setSubmitting(false);

    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }

    router.push(`/pagamento/${result.orderId}`);
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
                <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
                <Input label="CPF" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
                <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                <Input label="Telefone / WhatsApp" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-4">
              <h2 className="text-base font-bold text-dark-text">Forma de pagamento</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-accent bg-accent/5 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border-2 border-accent flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-dark-text">Pix</div>
                    <div className="text-xs text-success">Aprovação imediata · Melhor preço</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-dark-border cursor-pointer hover:border-accent/40 transition-colors opacity-60">
                  <div className="w-4 h-4 rounded-full border-2 border-dark-border-light" />
                  <div>
                    <div className="text-sm font-semibold text-dark-text">Cartão de crédito</div>
                    <div className="text-xs text-muted">Em breve</div>
                  </div>
                </div>
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
                  <span className="text-dark-text">{formatCurrency(insurance)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Frete</span>
                <span className="text-dark-text">A combinar</span>
              </div>
              <div className="border-t border-dark-border pt-3">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-dark-text">Total no Pix</span>
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
