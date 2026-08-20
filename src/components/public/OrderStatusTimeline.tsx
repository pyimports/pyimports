"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown } from "lucide-react";
import type { OrderStatus, OrderStatusHistory } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { formatDateTime } from "@/lib/formatters";

const STATUS_ORDER: OrderStatus[] = [
  "pending_payment",
  "payment_confirmed",
  "shipping_link_pending",
  "shipping_paid",
  "label_issued",
  "completed",
];

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  history?: OrderStatusHistory[];
}

export const OrderStatusTimeline = ({
  currentStatus,
  history = [],
}: OrderStatusTimelineProps) => {
  // Precisa vir antes do return antecipado de "cancelado" — hooks não podem
  // ser condicionais.
  const [expanded, setExpanded] = useState(false);

  if (currentStatus === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-danger-bg border border-danger/20 rounded-xl">
        <div className="w-8 h-8 bg-danger-bg border border-danger/30 rounded-full flex items-center justify-center">
          <span className="text-danger text-lg">✕</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-danger">Pedido cancelado</div>
          {history.find((h) => h.new_status === "cancelled") && (
            <div className="text-xs text-muted mt-0.5">
              {formatDateTime(history.find((h) => h.new_status === "cancelled")!.created_at)}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  // "pending_payment" é o único status que representa uma espera de verdade
  // (nada foi concluído ainda); todo o resto já é um evento concluído — então
  // o "último passo concluído" é o próprio currentIndex, exceto nesse caso.
  const lastCompletedIndex = currentStatus === "pending_payment" ? currentIndex - 1 : currentIndex;

  // Passos já concluídos e antigos ficam escondidos por padrão — só o passo
  // atual em diante aparece de cara, pra não poluir a tela com histórico que
  // o cliente já sabe. O cliente pode abrir e ver tudo se quiser.
  const collapseFromIndex = Math.max(0, lastCompletedIndex);
  const hiddenCount = expanded ? 0 : collapseFromIndex;

  return (
    <div className="space-y-0">
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted hover:text-accent transition-colors"
        >
          <span className="w-7 h-7 rounded-full border-2 border-dark-border-light bg-dark-alt flex items-center justify-center flex-shrink-0 text-sm tracking-tighter leading-none">
            •••
          </span>
          Ver {hiddenCount} {hiddenCount === 1 ? "passo anterior" : "passos anteriores"}
        </button>
      )}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-muted hover:text-accent transition-colors"
        >
          Ocultar passos anteriores
          <ChevronDown size={14} className="rotate-180" />
        </button>
      )}

      {STATUS_ORDER.map((status, i) => {
        if (i < hiddenCount) return null;
        // Cada label da timeline (exceto "Aguardando pagamento") descreve um
        // evento que já aconteceu ("Envio pago", "Etiqueta emitida"...), não
        // algo em progresso — então o passo atual conta como concluído
        // também. "pending_payment" é uma espera de verdade (ninguém
        // "concluiu" aguardar), por isso mostra o spinner.
        const isWaiting = status === "pending_payment" && i === currentIndex;
        // Depois que o cliente confirma o pagamento do frete, o próximo
        // passo (emissão da etiqueta) também vira uma espera de verdade —
        // mostra o spinner + aviso de que a etiqueta está sendo gerada, em
        // vez de ficar como um passo futuro qualquer sem nenhuma indicação.
        const isGeneratingLabel = status === "label_issued" && currentStatus === "shipping_paid";
        const isCompleted = i < currentIndex || (i === currentIndex && !isWaiting);
        const isCurrent = isWaiting || isGeneratingLabel;
        const historyEntry = history.find((h) => h.new_status === status);
        // A linha que sai do último passo concluído rumo ao próximo (ainda
        // não feito) ganha uma animação de "fluxo" — dá a sensação de
        // progresso em andamento, não só uma barra estática.
        const isLeadingEdge = i === lastCompletedIndex;

        return (
          <div key={status} className="flex gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  "w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  isCompleted
                    ? "bg-success/10 border-success"
                    : isCurrent
                    ? "bg-accent/10 border-accent"
                    : "bg-dark-alt border-dark-border-light",
                ].join(" ")}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : isCurrent ? (
                  <Loader2 size={14} className="text-accent animate-spin" />
                ) : (
                  <Circle size={14} className="text-muted" />
                )}
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={[
                    "w-0.5 flex-1 my-1 relative overflow-hidden",
                    isCompleted ? "bg-success/30" : "bg-dark-border",
                  ].join(" ")}
                  style={{ minHeight: "20px" }}
                >
                  {isLeadingEdge && <div className="absolute inset-0 animate-flow-down" />}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="pb-5 flex-1 min-w-0">
              <div
                className={[
                  "text-sm font-medium",
                  isCompleted
                    ? "text-success"
                    : isCurrent
                    ? "text-accent"
                    : "text-muted",
                ].join(" ")}
              >
                {ORDER_STATUS_LABELS[status]}
              </div>
              {historyEntry && (
                <div className="text-xs text-muted mt-0.5">
                  {formatDateTime(historyEntry.created_at)}
                  {historyEntry.notes && (
                    <span className="ml-2 text-dark-text/70">{historyEntry.notes}</span>
                  )}
                </div>
              )}
              {isCurrent && !historyEntry && (
                <div className="text-xs text-muted mt-0.5">
                  {isGeneratingLabel ? "Estamos gerando sua etiqueta..." : "Em andamento"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
