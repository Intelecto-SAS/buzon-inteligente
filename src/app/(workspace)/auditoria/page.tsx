import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canReadAudit } from "@/lib/security/permissions";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader, Panel } from "@/components/ui";

export default async function AuditPage() {
  const session = await getSession();
  if (!canReadAudit(session.role!)) notFound();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("audit_events").select("id, action, resource_type, resource_id, result, created_at, actor_id").eq("org_id", session.orgId).order("created_at", { ascending: false }).limit(200);
  return (
    <div>
      <PageHeader title="Auditoría" description="El historial se consulta y no se edita desde la aplicación." />
      {(data || []).length === 0 ? <EmptyState title="Sin eventos" body="Las altas, clasificaciones, asignaciones y cambios de reglas quedan registrados cuando ocurren." /> : (
        <Panel>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Fecha</th><th>Acción</th><th>Recurso</th><th>Resultado</th><th>Actor</th></tr></thead>
              <tbody>
                {(data || []).map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString("es-CO", { timeZone: session.timezone })}</td>
                    <td>{row.action}</td>
                    <td>{row.resource_type} {row.resource_id}</td>
                    <td>{row.result}</td>
                    <td>{row.actor_id || "sistema"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
