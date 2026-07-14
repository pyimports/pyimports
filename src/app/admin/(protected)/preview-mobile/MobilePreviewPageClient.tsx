"use client";

import React, { useState } from "react";
import { RefreshCw, Wifi, Battery, Smartphone } from "lucide-react";

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
const SCALE = 0.8;

export const MobilePreviewPageClient = () => {
  const [device, setDevice] = useState<DeviceSize>(DEVICES[1]);
  const [previewKey, setPreviewKey] = useState(0);

  const refresh = () => setPreviewKey((k) => k + 1);

  const frameW = device.width + PHONE_PADDING * 2;
  const frameH = PHONE_HEIGHT + PHONE_PADDING * 2;
  const scaledW = Math.ceil(frameW * SCALE);
  const scaledH = Math.ceil(frameH * SCALE);

  return (
    <div className="flex flex-col items-center gap-5 pb-10">

      {/* Barra de controles */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {/* Seletor de dispositivo */}
        <div className="flex items-center gap-1 bg-dark-surface border border-dark-border rounded-xl p-1">
          {DEVICES.map((d) => (
            <button
              key={d.width}
              onClick={() => setDevice(d)}
              className={[
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                device.width === d.width
                  ? "bg-accent text-dark-bg shadow-sm"
                  : "text-muted hover:text-dark-text hover:bg-dark-hover",
              ].join(" ")}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Botão atualizar */}
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-dark-text bg-dark-surface hover:bg-dark-hover border border-dark-border transition-all"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Nome do dispositivo */}
      <p className="text-xs text-muted -mt-2 flex items-center gap-1.5">
        <Smartphone size={12} />
        {device.name} · {device.width}px
      </p>

      {/* Moldura do celular */}
      <div
        style={{
          width: scaledW,
          height: scaledH,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Frame escalado */}
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
          {/* Shell do smartphone */}
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
            {/* Botão silenciar */}
            <div style={{ position: "absolute", left: -4, top: 108, width: 4, height: 30, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
            {/* Volume + */}
            <div style={{ position: "absolute", left: -4, top: 155, width: 4, height: 50, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
            {/* Volume - */}
            <div style={{ position: "absolute", left: -4, top: 218, width: 4, height: 50, background: "#3A3A3C", borderRadius: "2px 0 0 2px" }} />
            {/* Botão power */}
            <div style={{ position: "absolute", right: -4, top: 148, width: 4, height: 72, background: "#3A3A3C", borderRadius: "0 2px 2px 0" }} />

            {/* Tela */}
            <div
              style={{
                width: device.width,
                height: PHONE_HEIGHT,
                background: "#000",
                borderRadius: 36,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Site público real via iframe */}
              <iframe
                key={`${device.width}-${previewKey}`}
                src="/"
                width={device.width}
                height={PHONE_HEIGHT}
                style={{ display: "block", border: "none" }}
                title="Preview mobile da loja"
              />

              {/* Dynamic Island */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 120,
                  height: 34,
                  background: "#000",
                  borderRadius: 20,
                  pointerEvents: "none",
                  zIndex: 20,
                }}
              />

              {/* Barra de status */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 26,
                  paddingRight: 22,
                  pointerEvents: "none",
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
              </div>
            </div>

            {/* Barra home (iOS) */}
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

      {/* Rodapé informativo */}
      <p className="text-xs text-muted text-center">
        Renderizando o site público completo via iframe ·{" "}
        <span className="text-accent font-mono">{device.width}px</span> de viewport
      </p>
    </div>
  );
};
