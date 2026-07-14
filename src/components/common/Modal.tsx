"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={[
          "relative w-full bg-dark-surface border border-dark-border-light rounded-2xl",
          "shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
        ].join(" ")}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border sticky top-0 bg-dark-surface z-10">
            <h2 className="text-base font-semibold text-dark-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-dark-text transition-colors p-1 rounded-lg hover:bg-dark-alt"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted hover:text-dark-text transition-colors p-1 rounded-lg hover:bg-dark-alt z-10"
          >
            <X size={18} />
          </button>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-dark-border flex items-center justify-end gap-3 sticky bottom-0 bg-dark-surface">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
