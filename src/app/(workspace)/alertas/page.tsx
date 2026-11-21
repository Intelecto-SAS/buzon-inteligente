import { acknowledgeAlert } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function AlertsPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("alerts").select("*").eq("org_id", session.orgId).order("created_at", { ascending: false }).limit(100);
  const { data: incidents } = await supabase!.from("technical_incidents").select("*").order("created_at", { ascending: false }).limit(20);
  return (
    <div>
      <PageHeader title="Alertas y notificaciones" description="Las alertas críticas se generan en el procesamiento, aunque nadie tenga la aplicación abierta." />
      {(data || []).length === 0 ? <EmptyState title="No hay alertas" body="Aparecerán cuando una comunicación crítica, un vencimiento confirmado o un fallo de integración las produzca." /> : (
        <ul className="space-y-2">
          {(data || []).map((alert) => (
            <li key={alert.id} className="rounded-container border border-line bg-white p-4 text-sm">
              <p className="font-semibold">{alert.title}</p>
              <p className="text-muted">{alert.body}</p>
              <p className="text-xs text-faint">{alert.kind} · {alert.severity} · {alert.status}</p>
              {alert.case_id ? <Link className="text-primary" href={`/casos/${alert.case_id}`}>Abrir caso</Link> : null}
              {alert.status === "open" ? <form action={acknowledgeAlert.bind(null, alert.id)}><button className="mt-2 text-sm text-primary" type="submit">Confirmar lectura</button></form> : null}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-2 mt-8 text-sm font-semibold">Incidencias técnicas</h2>
      {(incidents || []).length === 0 ? <p className="text-sm text-muted">Sin incidencias registradas.</p> : (
        <ul className="text-sm">{(incidents || []).map((item) => <li key={item.id}>{item.source}: {item.message}</li>)}</ul>
      )}
    </div>
  );
}
