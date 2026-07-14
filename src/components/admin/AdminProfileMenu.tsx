"use client";

import React, { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { logoutAdmin, changeAdminPassword } from "@/lib/actions/auth";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
};

interface Props {
  name: string;
  email: string;
  role: string;
}

export function AdminProfileMenu({ name, email, role }: Props) {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const initial = name.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} title={name}>
        <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center hover:bg-accent/15 transition-colors">
          <span className="text-xs font-bold text-accent">{initial}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-dark-surface border border-dark-border-light rounded-2xl shadow-2xl z-30 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-dark-border">
            <p className="text-sm font-semibold text-dark-text truncate">{name}</p>
            <p className="text-xs text-muted truncate">{email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => { setShowPasswordModal(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-dark-text hover:bg-dark-hover transition-colors text-left"
            >
              <KeyRound size={15} className="text-muted" />
              Alterar senha
            </button>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-danger hover:bg-danger/5 transition-colors text-left"
              >
                <LogOut size={15} />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!currentPassword) {
      setError("Informe sua senha atual.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const result = await changeAdminPassword(currentPassword, newPassword);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1400);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Alterar senha"
      size="sm"
      footer={
        success ? undefined : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button variant="accent" onClick={handleSave} isLoading={saving}>Salvar nova senha</Button>
          </>
        )
      }
    >
      {success ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <p className="text-sm text-dark-text font-medium">Senha alterada com sucesso!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{error}</p>
          )}
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helper="Mínimo de 6 caracteres"
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      )}
    </Modal>
  );
}
