"use client";

import React, { useState } from "react";
import { Search, Package, ArrowLeft } from "lucide-react";
import { Container } from "@/components/common/SectionHeader";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { EmptyState } from "@/components/common/EmptyState";
import { OrderDetailView } from "@/components/public/OrderDetailView";
import { OrderSummaryCard } from "@/components/public/OrderSummaryCard";
import { maskCpf } from "@/lib/utils";
import { generateStoreWhatsAppLink } from "@/lib/whatsapp";
import { lookupOrdersByCpf, type PublicOrderDetail } from "@/lib/actions/order-lookup";

type SearchResult =
  | { kind: "single"; order: PublicOrderDetail }
  | { kind: "list"; orders: PublicOrderDetail[] };

interface Props {
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export default function AcompanharPedidoClient({ whatsappNumber, whatsappMessage }: Props) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PublicOrderDetail | null>(null);

  const resetSearchState = () => {
    setFormError("");
    setLookupError("");
    setResult(null);
    setViewingOrder(null);
  };

  const handleSearch = async () => {
    resetSearchState();
    if (!cpf.trim()) {
      setFormError("Preencha o CPF.");
      return;
    }
    setLoading(true);
    try {
      const res = await lookupOrdersByCpf(cpf);
      if ("error" in res) { setLookupError(res.error); return; }
      setResult(res.orders.length === 1 ? { kind: "single", order: res.orders[0] } : { kind: "list", orders: res.orders });
    } finally {
      setLoading(false);
    }
  };

  const showingDetail = result?.kind === "single" ? result.order : viewingOrder;

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-dark-text mb-2">Acompanhar pedido</h1>
          <p className="text-muted">Digite seu CPF para ver suas compras.</p>
        </div>

        {/* Esconde a busca quando já está vendo o detalhe de um pedido vindo de uma lista */}
        {!showingDetail && (
          <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 space-y-4 mb-8">
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              maxLength={14}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />

            {formError && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{formError}</p>
            )}

            <Button variant="accent" fullWidth onClick={handleSearch} isLoading={loading} leftIcon={<Search size={16} />}>
              Buscar meus pedidos
            </Button>
          </div>
        )}

        {/* Resultado: detalhe direto (1 pedido) */}
        {showingDetail && (
          <div className="space-y-4">
            {result?.kind === "list" && (
              <button
                onClick={() => setViewingOrder(null)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar para meus pedidos
              </button>
            )}
            <OrderDetailView order={showingDetail} />
          </div>
        )}

        {/* Resultado: lista "Meus pedidos" */}
        {result?.kind === "list" && !viewingOrder && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Meus pedidos ({result.orders.length})
            </h2>
            {result.orders.map((order) => (
              <OrderSummaryCard key={order.order_number} order={order} onSelect={() => setViewingOrder(order)} />
            ))}
          </div>
        )}

        {/* Sem resultado: mensagem elegante + WhatsApp, conforme pedido */}
        {lookupError && (
          <EmptyState
            title={lookupError}
            action={{
              label: "Falar no WhatsApp",
              onClick: () => window.open(generateStoreWhatsAppLink(whatsappNumber, whatsappMessage), "_blank"),
              variant: "accent",
            }}
          />
        )}
      </Container>
    </div>
  );
}
