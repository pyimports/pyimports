"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItemProps {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const FaqItem = ({ question, children, defaultOpen = false }: FaqItemProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-dark-text">{question}</span>
        <ChevronDown
          size={18}
          className={`text-accent flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-sm text-muted leading-relaxed space-y-2 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};
