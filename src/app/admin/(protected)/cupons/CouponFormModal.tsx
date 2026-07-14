"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Toggle } from "@/components/common/Toggle";
import { Button } from "@/components/common/Button";
import { COUPON_TYPE_LABELS } from "@/types";
import type { AdminCoupon, CouponFormInput } from "@/lib/actions/coupons";
import type { CouponType } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing: AdminCoupon | null;
  onSave: (input: CouponFormInput) => Promise<{ error?: string }>;
}

const TYPE_OPTIONS = [
  { value: "percentage",   label: COUPON_TYPE_LABELS.percentage },
  { value: "fixed",        label: COUPON_TYPE_LABELS.fixed },
  { value: "free_shipping", label: COUPON_TYPE_LABELS.free_shipping },
];

const EMPTY: CouponFormInput = {
  code:                  "",
  description_internal:  "",
  type:                  "percentage",
  value:                 "",
  is_active:             true,
  start_date:            "",
  expiration_date:       "",
  max_uses_total:        "",
  max_uses_per_customer: "",
  min_order_value:       "",
};

function couponToInput(c: AdminCoupon): CouponFormInput {
  return {
    code:                  c.code,
    description_internal:  c.description_internal ?? "",
    type:                  c.type,
    value:                 c.type === "free_shipping" ? "" : String(c.value),
    is_active:             c.is_active,
    start_date:            c.start_date ?? "",
    expiration_date:       c.expiration_date ?? "",
    max_uses_total:        c.max_uses_total != null ? String(c.max_uses_total) : "",
    max_uses_per_customer: c.max_uses_per_customer != null ? String(c.max_uses_per_customer) : "",
    min_order_value:       c.min_order_value != null ? String(c.min_order_value) : "",
  };
}

export function CouponFormModal({ isOpen, onClose, editing, onSave }: Props) {
  const [form, setForm]   = useState<CouponFormInput>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(editing ? couponToInput(editing) : EMPTY);
      setError("");
    }
  }, [isOpen, editing]);

  const set = <K extends keyof CouponFormInput>(key: K, value: CouponFormInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSave(form);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  const isEdit = !!editing;
  const showValue = form.type !== "free_shipping";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar cupom" : "Novo cupom"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
          >
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar cupom"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Código + Ativo */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Input
              label="Código do cupom"
              required
              placeholder="EX: DESCONTO10"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              disabled={saving}
            />
          </div>
          <div className="flex-shrink-0 pb-0.5">
            <Toggle
              checked={form.is_active}
              onChange={(v) => set("is_active", v)}
              label="Ativo"
              disabled={saving}
            />
          </div>
        </div>

        {/* Descrição interna */}
        <Input
          label="Descrição interna (opcional)"
          placeholder="Cupom de boas-vindas para novos clientes"
          value={form.description_internal}
          onChange={(e) => set("description_internal", e.target.value)}
          disabled={saving}
        />

        {/* Tipo + Valor */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de desconto"
            required
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(v) => {
              set("type", v as CouponType);
              if (v === "free_shipping") set("value", "");
            }}
            disabled={saving}
          />

          {showValue ? (
            <Input
              label={
                form.type === "percentage"
                  ? "Desconto (%)"
                  : "Valor do desconto (R$)"
              }
              required
              type="number"
              min={form.type === "percentage" ? "1" : "0.01"}
              max={form.type === "percentage" ? "99" : undefined}
              step={form.type === "percentage" ? "1" : "0.01"}
              placeholder={form.type === "percentage" ? "10" : "50.00"}
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              helper={
                form.type === "fixed"
                  ? "Quanto o cliente economiza. Ex: 50.00 para R$50 de desconto"
                  : undefined
              }
              disabled={saving}
            />
          ) : (
            <div className="flex items-end pb-0.5">
              <p className="text-sm text-muted">Zera o valor do frete no checkout.</p>
            </div>
          )}
        </div>

        {/* Validade */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Início (opcional)"
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            disabled={saving}
          />
          <Input
            label="Validade (opcional)"
            type="date"
            value={form.expiration_date}
            onChange={(e) => set("expiration_date", e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Limites */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Limite total de usos"
            type="number"
            min="1"
            step="1"
            placeholder="Ilimitado"
            value={form.max_uses_total}
            onChange={(e) => set("max_uses_total", e.target.value)}
            helper={form.max_uses_total ? `Máximo ${form.max_uses_total} pedidos` : "Vazio = ilimitado"}
            disabled={saving}
          />
          <Input
            label="Limite por cliente"
            type="number"
            min="1"
            step="1"
            placeholder="Ilimitado"
            value={form.max_uses_per_customer}
            onChange={(e) => set("max_uses_per_customer", e.target.value)}
            helper="Vazio = ilimitado"
            disabled={saving}
          />
        </div>

        {/* Pedido mínimo */}
        <Input
          label="Valor mínimo do pedido (R$)"
          type="number"
          min="0"
          step="0.01"
          placeholder="Sem mínimo"
          value={form.min_order_value}
          onChange={(e) => set("min_order_value", e.target.value)}
          helper={
            form.type === "fixed" && form.min_order_value
              ? `Subtotal mínimo do carrinho para ativar o desconto de ${
                  form.value ? `R$${parseFloat(form.value).toFixed(2)}` : "R$?"
                }`
              : "Subtotal mínimo do carrinho. Vazio = sem restrição"
          }
          disabled={saving}
        />
      </form>
    </Modal>
  );
}
