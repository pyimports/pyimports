import { createClient } from "@/lib/supabase/server";
import { getAdminStoreSettings, getAdminUsers } from "@/lib/db/settings";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [settings, admins] = await Promise.all([
    getAdminStoreSettings(),
    getAdminUsers(),
  ]);

  return (
    <ConfiguracoesClient
      initialSettings={settings}
      initialAdmins={admins}
      currentAdminId={user?.id ?? ""}
    />
  );
}
