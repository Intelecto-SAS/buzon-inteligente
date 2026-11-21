import { createTeam, inviteUser } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";
import { InviteResult } from "./invite-result";

export default async function UsersPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data: members } = await supabase!.from("memberships").select("user_id, role, status, profiles(full_name)").eq("org_id", session.orgId);
  const { data: teams } = await supabase!.from("teams").select("id, name").eq("org_id", session.orgId);
  const admin = canManageConfiguration(session.role!);
  return (
    <div>
      <PageHeader title="Usuarios y equipos" description="El administrador no recibe por su rol la lectura de todos los buzones. El acceso se otorga por buzón." />
      <ul className="mb-4 text-sm">{(members || []).map((member) => <li key={member.user_id}>{(member.profiles as { full_name?: string } | null)?.full_name || member.user_id} · {member.role} · {member.status}</li>)}</ul>
      <h2 className="text-sm font-semibold">Equipos</h2>
      <ul className="mb-4 text-sm">{(teams || []).map((team) => <li key={team.id}>{team.name}</li>)}</ul>
      {admin ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InviteResult action={inviteUser} />
          <form action={createTeam} className="space-y-2 rounded-container border border-line bg-white p-4">
            <Field label="Nuevo equipo"><input className={inputClass} name="name" required /></Field>
            <Button type="submit">Crear equipo</Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
