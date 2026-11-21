import { saveHoliday } from "@/server/actions";
import { integrationStatus } from "@/lib/env";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const status = integrationStatus();
  const { data: holidays } = await supabase!.from("holidays").select("id, day, name, calendars!inner(org_id)").eq("calendars.org_id", session.orgId);
  const { data: policies } = await supabase!.from("attention_policies").select("*").eq("org_id", session.orgId);
  const admin = canManageConfiguration(session.role!);
  return (
    <div>
      <PageHeader title="Configuración" description={`Zona horaria ${session.timezone}. Los plazos legales no usan una cifra universal.`} />
      <h2 className="text-sm font-semibold">Estado de integraciones</h2>
      <ul className="mb-4 text-sm">
        {Object.entries(status).map(([key, value]) => <li key={key}>{key}: {value ? "configurado" : "pendiente"}</li>)}
      </ul>
      <h2 className="text-sm font-semibold">Política interna de atención</h2>
      <ul className="mb-4 text-sm">{(policies || []).map((policy) => <li key={policy.id}>{policy.priority}: primera atención {policy.first_response_hours} h, escalar a las {policy.escalate_after_hours} h</li>)}</ul>
      <h2 className="text-sm font-semibold">Festivos del calendario</h2>
      <ul className="mb-4 text-sm">{(holidays || []).length === 0 ? <li>No hay festivos cargados. Los días hábiles solo excluyen sábado y domingo hasta que registre el calendario.</li> : (holidays || []).map((item) => <li key={item.id}>{item.day}: {item.name}</li>)}</ul>
      {admin ? (
        <form action={saveHoliday} className="flex flex-wrap gap-2">
          <Field label="Fecha"><input className={inputClass} type="date" name="day" required /></Field>
          <Field label="Nombre"><input className={inputClass} name="name" required /></Field>
          <Button type="submit">Agregar festivo</Button>
        </form>
      ) : null}
      <section className="mt-8 text-sm text-muted">
        <h2 className="font-semibold text-ink">Integraciones no disponibles</h2>
        <p>GeDeSS, radicación oficial, gestión documental, Teams y SharePoint no están conectados. No se presentan como operativos.</p>
      </section>
    </div>
  );
}
