import { saveRule, setRuleActive } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { Button, EmptyState, Field, inputClass, PageHeader } from "@/components/ui";

const SAMPLE = {
  trigger: "message.received",
  stopOnMatch: false,
  root: { op: "and", conditions: [{ field: "priority", op: "eq", value: "critica" }], groups: [] },
  actions: [{ type: "raise_alert", params: { severity: "critica" } }],
};

export default async function AutomationsPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("automation_rules").select("*, automation_runs(id, status, created_at)").eq("org_id", session.orgId).order("priority");
  const admin = canManageConfiguration(session.role!);
  return (
    <div>
      <PageHeader title="Automatizaciones" description="Las reglas se evalúan en el servidor al procesar eventos. Las acciones sensibles quedan bloqueadas si la regla no está autorizada." />
      {(data || []).length === 0 ? <EmptyState title="No hay reglas" body="Cree una regla inactiva, revísela y actívela cuando el alcance sea el esperado." /> : (
        <ul className="space-y-3">
          {(data || []).map((rule) => (
            <li key={rule.id} className="rounded-container border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{rule.name} · v{rule.version} · {rule.active ? "activa" : "inactiva"}</p>
              <p className="text-muted">{rule.description}</p>
              <p className="mt-1 text-xs text-faint">Ejecuciones registradas: {(rule.automation_runs as { id: string }[]).length}</p>
              {admin ? <form action={setRuleActive.bind(null, rule.id, !rule.active)}><Button className="mt-2" variant="secondary" type="submit">{rule.active ? "Desactivar" : "Activar"}</Button></form> : null}
            </li>
          ))}
        </ul>
      )}
      {admin ? (
        <form action={saveRule} className="mt-4 grid gap-3 rounded-container border border-line bg-white p-4">
          <Field label="Nombre"><input className={inputClass} name="name" required /></Field>
          <Field label="Descripción"><input className={inputClass} name="description" /></Field>
          <Field label="Prioridad"><input className={inputClass} name="priority" type="number" defaultValue={100} /></Field>
          <Field label="Definición JSON"><textarea className="min-h-40 w-full rounded-control border border-line p-2 font-mono text-xs" name="definition" defaultValue={JSON.stringify(SAMPLE, null, 2)} /></Field>
          <label className="text-sm"><input type="checkbox" name="sensitive" /> Autorizar acciones sensibles de esta regla</label>
          <Button type="submit">Guardar inactiva</Button>
        </form>
      ) : <p className="mt-4 text-sm text-muted">Puede consultar las reglas. Los cambios los registra un administrador.</p>}
    </div>
  );
}
