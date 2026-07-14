"use client";

import React, { useState, useEffect } from "react";
import { X, Smartphone, RefreshCw, Wifi, Battery } from "lucide-react";

interface DeviceSize {
  label: string;
  width: number;
  name: string;
}

const DEVICES: DeviceSize[] = [
  { label: "360px", width: 360, name: "Android" },
  { label: "390px", width: 390, name: "iPhone 15" },
  { label: "430px", width: 430, name: "iPhone 15 Plus" },
];

const PHONE_HEIGHT = 844;
const PHONE_PADDING = 14;
const SCALE = 0.65;

interface MobilePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedAt?: number;
}

export const MobilePreviewPanel = ({
  isOpen,
  onClose,
  savedAt = 0,
}: MobilePreviewPanelProps) => {
  const [device, setDevice] = useState<DeviceSize>(DEVICES[1]);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (savedAt > 0) setPreviewKey((k) => k + 1);
  }, [savedAt]);

  const refresh = () => setPreviewKey((k) => k + 1);

  const frameW = device.width + PHONE_PADDING * 2;
  const frameH = PHONE_HEIGHT + PHONE_PADDING * 2;

  const scaledW = Math.ceil(frameW * SCALE);
  const scaledH = Math.ceil(frameH * SCALE);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
          "bg-dark-surface border-l border-dark-border shadow-2xl",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ width: 480 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Smartphone size={17} className="text-accent" />
            <span className="font-semibold text-dark-text text-sm">Preview Mobile</span>
            <span className="text-xs text-muted">· {device.name}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-dark-alt hover:bg-dark-hover border border-dark-border flex items-center justify-center text-muted hover:text-dark-text transition-all"
            aria-label="Fechar preview"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Device switcher ── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-dark-border flex-shrink-0">
          <span className="text-xs text-muted mr-1">Dispositivo:</span>
          {DEVICES.map((d) => (
            <button
              key={d.width}
              onClick={() => setDevice(d)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                device.width === d.width
                  ? "bg-accent text-dark-bg"
                  : "bg-dark-alt text-muted hover:text-dark-text hover:bg-dark-hover border border-dark-border",
              ].join(" ")}
            >
              {d.label}
            </button>
          ))}
          <button
            onClick={refresh}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-dark-text bg-dark-alt hover:bg-dark-hover border border-dark-border transition-all"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        </div>

        {/* ── Phone mockup ── */}
        <div className="flex-1 flex items-start justify-center overflow-y-auto py-6 bg-dark-bg">
          {/* Outer container sized to scaled dimensions — prevents layout overflow */}
          <div
            style={{
              width: scaledW,
              height: scaledH,
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* Scaled phone frame */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: frameW,
                height: frameH,
                transform: `scale(${SCALE})`,
                transformOrigin: "top left",
              }}
            >
              {/* Shell */}
              <div
                style={{
                  width: frameW,
                  height: frameH,
                  background:
                    "linear-gradient(148deg, #2C2C2E 0%, #1C1C1E 55%, #242426 100%)",
                  borderRadius: 46,
                  padding: PHONE_PADDING,
                  boxShadow: [
                    "0 0 0 1.5px #3A3A3C",
                    "0 0 0 3.5px #101012",
                    "inset 0 1px 0 rgba(255,255,255,0.08)",
                    "0 40px 100px rgba(0,0,0,0.75)",
                    "0 12px 32px rgba(0,0,0,0.45)",
                  ].join(", "),
                  position: "relative",
                }}
              >
                {/* Silent toggle */}
                <div style={{ position: "absolute", left: -4, top: 108, width: 4, height: 30, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
                {/* Volume up */}
                <div style={{ position: "absolute", left: -4, top: 155, width: 4, height: 50, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
                {/* Volume down */}
                <div style={{ position: "absolute", left: -4, top: 218, width: 4, height: 50, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
                {/* Power */}
                <div style={{ position: "absolute", right: -4, top: 148, width: 4, height: 72, background: "#3A3A3C", borderRadius: "0 2px 2px 0" }} />

                {/* Screen */}
                <div
                  style={{
                    width: device.width,
                    height: PHONE_HEIGHT,
                    background: "#000",
                    borderRadius: 36,
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Status bar — reserva espaço de verdade (não sobrepõe o site),
                      igual a como um navegador mobile de verdade funciona: a barra
                      de status é chrome do SO, nunca fica por cima do conteúdo. */}
                  <div
                    style={{
                      position: "relative",
                      flexShrink: 0,
                      height: 52,
                      background: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: 26,
                      paddingRight: 22,
                      zIndex: 15,
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: -0.3,
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      9:41
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Wifi size={13} color="#fff" />
                      <Battery size={14} color="#fff" />
                    </div>

                    {/* Dynamic Island — dentro da própria barra de status, não sobre o site */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 120,
                        height: 34,
                        background: "#000",
                        borderRadius: 20,
                        pointerEvents: "none",
                      }}
                    />
                  </div>

                  {/* Public site — real iframe, agora abaixo da barra de status */}
                  <iframe
                    key={`${device.width}-${previewKey}`}
                    src="/"
                    width={device.width}
                    height={PHONE_HEIGHT - 52}
                    style={{ display: "block", border: "none", flex: 1 }}
                    title="Preview mobile da loja"
                  />
                </div>

                {/* Home indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 120,
                    height: 5,
                    background: "rgba(255,255,255,0.22)",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-dark-border flex-shrink-0 text-center">
          <p className="text-xs text-muted">
            Viewport:{" "}
            <span className="text-accent font-mono">{device.width}px</span>
            {" · "}Site público completo em iframe
          </p>
        </div>
      </div>
    </>
  );
};
