import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await getSession();
  const supabase = await createUserClient();
  const since = params.desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: messages } = await supabase!.from("messages").select("id, received_at, category_id, classification_source, priority").eq("org_id", session.orgId).gte("received_at", since);
  const { data: cases } = await supabase!.from("cases").select("id, status, priority, assignee_id, due_at, due_status, first_response_at, received_at, category_id").eq("org_id", session.orgId);
  const rows = messages || [];
  const caseRows = cases || [];
  const open = caseRows.filter((item) => item.status !== "cerrado");
  const critical = open.filter((item) => item.priority === "critica");
  const unassigned = open.filter((item) => !item.assignee_id);
  const overdue = open.filter((item) => item.due_status === "confirmed" && item.due_at && new Date(item.due_at) < new Date());
  const dueSoon = open.filter((item) => item.due_status === "confirmed" && item.due_at && new Date(item.due_at) >= new Date() && new Date(item.due_at).getTime() - Date.now() < 48 * 3600 * 1000);
  const responded = caseRows.filter((item) => item.status === "respondido" || item.status === "cerrado");
  const withFirst = caseRows.filter((item) => item.first_response_at && item.received_at);
  const avgFirst = withFirst.length ? Math.round(withFirst.reduce((sum, item) => sum + (new Date(item.first_response_at).getTime() - new Date(item.received_at).getTime()), 0) / withFirst.length / 3600000) : null;
  const onTime = withFirst.filter((item) => !item.due_at || new Date(item.first_response_at) <= new Date(item.due_at));
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = new Date(row.received_at).toLocaleDateString("es-CO", { timeZone: session.timezone, month: "2-digit", day: "2-digit" });
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }
  const max = Math.max(1, ...byDay.values());
  const cards = [
    ["Correos en el periodo", rows.length, "/bandeja"],
    ["Casos abiertos", open.length, "/casos"],
    ["Casos críticos", critical.length, "/casos?prioridad=critica"],
    ["Sin asignar", unassigned.length, "/casos?sinAsignar=1"],
    ["Por vencer", dueSoon.length, "/casos?vencimiento=proximo"],
    ["Vencidos", overdue.length, "/casos?vencimiento=vencido"],
    ["Respondidos o cerrados", responded.length, "/casos?estado=respondido"],
    ["Clasificación automática", rows.filter((item) => item.classification_source === "automatic").length, "/bandeja?origen=automatic"],
    ["Reclasificación manual", rows.filter((item) => item.classification_source === "manual").length, "/bandeja?origen=manual"],
  ];
  return (
    <div>
      <PageHeader title="Dashboard" description={`Indicadores calculados con los registros de ${session.orgName}. Zona ${session.timezone}.`} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <label>Desde <input className="h-9 rounded-control border border-line px-2" type="date" name="desde" defaultValue={params.desde || ""} /></label>
        <button className="h-9 rounded-control bg-primary px-3 text-white" type="submit">Filtrar</button>
      </form>
      {rows.length === 0 && caseRows.length === 0 ? (
        <EmptyState title="Sin comunicaciones en el periodo" body="Los indicadores aparecen cuando un buzón autorizado sincroniza correos o cuando existen casos. No hay cifras precargadas." action={<Link className="text-sm font-semibold text-primary" href="/buzones">Conectar un buzón</Link>} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(([label, value, href]) => (
              <Link key={String(label)} href={String(href)} className="rounded-container border border-line bg-white px-4 py-3">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Panel className="p-4">
              <h2 className="text-sm font-semibold">Volumen por fecha</h2>
              {byDay.size === 0 ? <p className="mt-3 text-sm text-muted">Sin mensajes en el periodo.</p> : (
                <ul className="mt-3 space-y-2">
                  {[...byDay.entries()].map(([day, count]) => (
                    <li key={day} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-xs">
                      <span>{day}</span>
                      <span className="h-2 bg-[#F3F4F6]"><span className="block h-2 bg-primary" style={{ width: `${(count / max) * 100}%` }} /></span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel className="p-4">
              <h2 className="text-sm font-semibold">Atención</h2>
              <p className="mt-3 text-sm">Tiempo promedio de primera atención: {avgFirst === null ? "sin registros de primera atención" : `${avgFirst} h`}.</p>
              <p className="mt-1 text-sm">Atención dentro del plazo confirmado: {withFirst.length ? `${Math.round((onTime.length / withFirst.length) * 100)} %` : "sin plazos confirmados"}.</p>
              <p className="mt-2 text-xs text-faint">Los plazos legales no confirmados no entran en el porcentaje.</p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
