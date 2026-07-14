import type { Metadata } from "next";
import { getAllAnnouncements } from "@/lib/actions/announcements";
import { AnunciosClient } from "./AnunciosClient";

export const metadata: Metadata = { title: "Avisos" };

export default async function AnunciosPage() {
  const announcements = await getAllAnnouncements();
  return <AnunciosClient initialAnnouncements={announcements} />;
}
