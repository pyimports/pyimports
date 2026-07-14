"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn, ShieldAlert } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { loginAdmin } from "@/lib/actions/auth";
import { routes } from "@/lib/routes";

export default function AdminLoginPage() {
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]   = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAdmin(email, password, rememberMe);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-dark-text mb-1">Área administrativa</h1>
          <p className="text-sm text-muted">Acesso restrito</p>
        </div>

        {/* Card */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@loja.com"
              required
              autoComplete="email"
            />
            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted hover:text-dark-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {/* Lembrar-me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={[
                    "w-4 h-4 rounded border-2 transition-colors duration-150 flex items-center justify-center",
                    rememberMe
                      ? "bg-accent border-accent"
                      : "bg-transparent border-dark-border-light group-hover:border-accent/50",
                  ].join(" ")}
                >
                  {rememberMe && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="black"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted group-hover:text-dark-text transition-colors">
                Lembrar-me neste dispositivo
              </span>
            </label>

            {error && (
              <p className="text-sm text-danger text-center">{error}</p>
            )}

            <Button
              type="submit"
              variant="accent"
              fullWidth
              size="lg"
              isLoading={isPending}
              leftIcon={<LogIn size={18} />}
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <Link href={routes.home} className="hover:text-dark-text transition-colors">
            ← Voltar à loja
          </Link>
        </p>
      </div>
    </div>
  );
}
