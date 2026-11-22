import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { humanize } from "@/lib/labels";

export default async function ReportsPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data: cases } = await supabase!.from("cases").select("status, priority, assignee_id, category_id").eq("org_id", session.orgId);
  const rows = cases || [];
  if (!rows.length) return <div><PageHeader title="Reportes" /><EmptyState title="Sin datos para reportar" body="El reporte se calcula sobre las tareas de la organización." /></div>;
  const byStatus = new Map<string, number>();
  for (const row of rows) byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
  return (
    <div>
      <PageHeader title="Reportes" description="Conteos de tareas, sin duplicar por cada correo asociado." />
      <ul className="text-sm">{[...byStatus.entries()].map(([status, count]) => <li key={status}>{humanize(status)}: {count}</li>)}</ul>
    </div>
  );
}
