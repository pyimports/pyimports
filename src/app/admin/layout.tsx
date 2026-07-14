import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "PYimports | Admin",
    template: "%s | PYimports Admin",
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
