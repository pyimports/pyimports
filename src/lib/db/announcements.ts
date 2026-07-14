import { createClient } from "@/lib/supabase/server";
import type { Announcement, AnnouncementType } from "@/types";

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id:            row.id,
    type:          row.type as AnnouncementType,
    title:         row.title,
    message:       row.message,
    is_active:     row.is_active,
    display_order: row.display_order,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
  }));
}
