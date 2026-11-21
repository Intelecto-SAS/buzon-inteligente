export const dynamic = "force-dynamic";

import { Shell } from "@/components/shell";
import { getSession } from "@/lib/session";
import { canViewModule, MODULES, type ModuleKey } from "@/lib/security/permissions";
import { createUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.configured) redirect("/");
  if (!session.userId) redirect("/login");
  if (!session.orgId || !session.role) redirect("/organizacion");
  const modules = MODULES.filter((item) => canViewModule(session.role!, item));
  const supabase = await createUserClient();
  const { count } = await supabase!.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", session.userId).is("read_at", null);
  return (
    <Shell role={session.role} name={session.fullName || session.email || "Usuario"} org={session.orgName || "Organización"} email={session.email || ""} unread={count || 0} modules={modules as ModuleKey[]}>
      {children}
    </Shell>
  );
}
