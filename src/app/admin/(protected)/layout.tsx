import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Verifica e busca perfil de admin via service client (bypassa RLS)
  const service = createServiceClient();
  const { data: profile } = await service
    .from("admin_profiles")
    .select("id, name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/admin/login");

  return (
    <AdminShell adminName={profile.name} adminEmail={profile.email} adminRole={profile.role}>
      {children}
    </AdminShell>
  );
}
