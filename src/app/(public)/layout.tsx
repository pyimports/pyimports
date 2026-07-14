import React from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { CartToast } from "@/components/public/CartToast";
import { MaintenanceScreen } from "@/components/public/MaintenanceScreen";
import { getTopLevelCategories as dbGetTopLevelCategories } from "@/lib/db/categories";
import { getActiveAnnouncements } from "@/lib/db/announcements";
import { getPublicStoreSettings, isMaintenanceModeActive } from "@/lib/db/settings";
import { generateStoreWhatsAppLink } from "@/lib/whatsapp";
import { mockCategories } from "@/data/mock-categories";
import type { Category, Announcement } from "@/types";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicStoreSettings();

  if (await isMaintenanceModeActive()) {
    return (
      <MaintenanceScreen
        whatsappLink={generateStoreWhatsAppLink(settings.whatsapp_number, settings.whatsapp_default_message)}
      />
    );
  }

  let categories: Category[] = [];
  try {
    categories = await dbGetTopLevelCategories();
  } catch {
    categories = mockCategories.filter((c) => c.is_active && !c.parent_id);
  }

  let announcements: Announcement[] = [];
  try {
    announcements = await getActiveAnnouncements();
  } catch {
    announcements = [];
  }

  return (
    <>
      <PublicNavbar
        categories={categories}
        announcements={announcements}
        whatsappNumber={settings.whatsapp_number}
        whatsappMessage={settings.whatsapp_default_message}
      />
      <main className="flex-1 pt-24">{children}</main>
      <PublicFooter categories={categories} whatsappNumber={settings.whatsapp_number} />
      <WhatsAppButton phone={settings.whatsapp_number} message={settings.whatsapp_default_message} />
      <CartToast />
    </>
  );
}
