import { createTeam, inviteUser, updateMemberRole } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { humanize } from "@/lib/labels";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";
import { InviteResult } from "./invite-result";

const ROLES = ["administrador", "supervisor", "usuario", "auditor"];

export default async function UsersPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data: members } = await supabase!.from("memberships").select("user_id, role, status, profiles(full_name, email)").eq("org_id", session.orgId).eq("status", "active");
  const { data: teams } = await supabase!.from("teams").select("id, name").eq("org_id", session.orgId);
  const admin = canManageConfiguration(session.role!);
  return (
    <div>
      <PageHeader title="Usuarios y equipos" description="Cada persona entra con su correo. El rol define qué módulos ve y qué puede cambiar. El acceso a un buzón se otorga aparte." />
      <ul className="mb-6 space-y-2">
        {(members || []).map((member) => {
          const profile = member.profiles as { full_name?: string; email?: string } | null;
          return (
            <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">{profile?.full_name || "Usuario"}</p>
                <p className="text-xs text-faint">{profile?.email || "Sin correo"} · {humanize(member.status)}</p>
              </div>
              {admin ? (
                <form action={updateMemberRole} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={member.user_id} />
                  <label className="sr-only" htmlFor={`rol-${member.user_id}`}>Rol de {profile?.full_name || "usuario"}</label>
                  <select id={`rol-${member.user_id}`} className="h-9 rounded-control border border-line px-2" name="role" defaultValue={member.role}>
                    {ROLES.map((role) => <option key={role} value={role}>{humanize(role)}</option>)}
                  </select>
                  <Button type="submit" variant="secondary">Guardar rol</Button>
                </form>
              ) : <p className="font-semibold">{humanize(member.role)}</p>}
            </li>
          );
        })}
      </ul>
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
      ) : <p className="text-sm text-muted">Su rol consulta el directorio. Solo un administrador cambia roles.</p>}
    </div>
  );
}
