import React from "react";
import { MobilePreviewPageClient } from "./MobilePreviewPageClient";

export default function PreviewMobilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dark-text">Preview Mobile</h1>
        <p className="text-sm text-muted mt-0.5">
          Visualize o site público completo como aparece no celular.
        </p>
      </div>

      <MobilePreviewPageClient />
    </div>
  );
}
