import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { humanize, TASK_STATUSES } from "@/lib/labels";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await getSession();
  const supabase = await createUserClient();
  let query = supabase!.from("cases").select("id, public_code, subject, status, priority, due_at, due_status, assignee_id, received_at, categories(name)", { count: "exact" }).eq("org_id", session.orgId).order("received_at", { ascending: false });
  if (params.estado) query = query.eq("status", params.estado);
  if (params.prioridad) query = query.eq("priority", params.prioridad);
  if (params.sinAsignar === "1") query = query.is("assignee_id", null);
  const page = Number(params.page || 0);
  const { data, count } = await query.range(page * 25, page * 25 + 24);
  return (
    <div>
      <PageHeader title="Tareas" description="Una tarea agrupa comunicaciones, notas y respuestas. No se cierra por un acuse." />
      <form className="mb-3 flex flex-wrap gap-2" method="get">
        <select className="h-9 rounded-control border border-line px-2 text-sm" name="estado" defaultValue={params.estado || ""}>
          <option value="">Estado</option>
          {TASK_STATUSES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}
        </select>
        <select className="h-9 rounded-control border border-line px-2 text-sm" name="prioridad" defaultValue={params.prioridad || ""}>
          <option value="">Prioridad</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baja">Baja</option>
        </select>
        <button className="h-9 rounded-control bg-primary px-3 text-sm text-white" type="submit">Filtrar</button>
      </form>
      {(data || []).length === 0 ? <EmptyState title="No hay tareas" body="Las tareas se abren al procesar una comunicación o desde una regla que las cree." /> : (
        <Panel>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Código</th><th>Asunto</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Plazo legal</th></tr></thead>
              <tbody>
                {(data || []).map((item) => (
                  <tr key={item.id}>
                    <td><Link href={`/casos/${item.id}`}>{item.public_code}</Link></td>
                    <td>{item.subject}</td>
                    <td>{(item.categories as { name?: string } | null)?.name || "—"}</td>
                    <td><Badge tone={item.priority === "critica" ? "danger" : "neutral"}>{humanize(item.priority)}</Badge></td>
                    <td>{humanize(item.status)}</td>
                    <td>{item.due_status === "confirmed" && item.due_at ? new Date(item.due_at).toLocaleString("es-CO", { timeZone: session.timezone }) : "Pendiente de validación"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-2 text-sm text-muted">{count} tareas</p>
        </Panel>
      )}
    </div>
  );
}
