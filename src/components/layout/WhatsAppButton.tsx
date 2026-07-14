"use client";

import React, { useState } from "react";
import { STORE_WHATSAPP, generateStoreWhatsAppLink } from "@/lib/whatsapp";

export const WhatsAppButton = ({
  phone = STORE_WHATSAPP,
  message,
}: {
  phone?: string;
  message?: string;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={generateStoreWhatsAppLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 group"
      aria-label="Falar no WhatsApp"
    >
      {hovered && (
        <span className="bg-dark-surface border border-dark-border text-dark-text text-sm font-medium px-3 py-2 rounded-xl shadow-xl whitespace-nowrap animate-fade-in">
          Falar no WhatsApp
        </span>
      )}
      <div className="relative w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center shadow-lg shadow-whatsapp/30 hover:scale-110 transition-transform duration-200">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.85L.057 23.945l6.27-1.647A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.805 9.805 0 01-5.001-1.368l-.359-.214-3.72.976 1.001-3.617-.235-.372A9.817 9.817 0 012.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/>
        </svg>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-whatsapp animate-ping opacity-20" />
      </div>
    </a>
  );
};
