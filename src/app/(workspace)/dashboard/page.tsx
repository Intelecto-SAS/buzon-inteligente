import { Donut, Bars, Metric, Volume, type Slice } from "@/components/dashboard-charts";
import { EmptyState, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  sin_asignar: "Sin asignar",
  asignado: "Asignado",
  en_gestion: "En gestión",
  pendiente_informacion: "Pendiente de información",
  pendiente_aprobacion: "Pendiente de aprobación",
  respondido: "Respondido",
  cerrado: "Cerrado",
  pendiente_clasificacion: "Sin clasificar",
  recibido: "Recibido",
};

const STATUS_COLOR: Record<string, string> = {
  sin_asignar: "#B91C1C",
  asignado: "#962D46",
  en_gestion: "#1D4ED8",
  pendiente_informacion: "#B45309",
  pendiente_aprobacion: "#9A3412",
  respondido: "#15803D",
  cerrado: "#71717A",
  pendiente_clasificacion: "#A1A1AA",
  recibido: "#64748B",
};

const CATEGORY_COLOR = ["#962D46", "#1D4ED8", "#B45309", "#15803D", "#7D2339", "#0F766E"];
const PRIORITY_ORDER = ["critica", "alta", "normal", "baja"] as const;
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  critica: { label: "Crítica", color: "#B91C1C" },
  alta: { label: "Alta", color: "#B45309" },
  normal: { label: "Normal", color: "#962D46" },
  baja: { label: "Baja", color: "#1D4ED8" },
};

type CaseRow = {
  status: string;
  priority: string | null;
  assignee_id: string | null;
  due_at: string | null;
  due_status: string | null;
  first_response_at: string | null;
  received_at: string;
  category_id: string | null;
};

function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await getSession();
  const supabase = await createUserClient();
  const since = params.desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: messages } = await supabase!.from("messages").select("id, received_at, category_id, classification_source, priority").eq("org_id", session.orgId).gte("received_at", since);
  const { data: cases } = await supabase!.from("cases").select("id, status, priority, assignee_id, due_at, due_status, first_response_at, received_at, category_id").eq("org_id", session.orgId);
  const { data: categories } = await supabase!.from("categories").select("id, name").eq("org_id", session.orgId);
  const { data: profiles } = await supabase!.from("profiles").select("id, full_name");
  const rows = messages || [];
  const caseRows = (cases || []) as CaseRow[];
  const categoryName = new Map((categories || []).map((item: { id: string; name: string }) => [item.id, item.name]));
  const personName = new Map((profiles || []).map((item: { id: string; full_name: string }) => [item.id, item.full_name]));

  const open = caseRows.filter((item) => item.status !== "cerrado" && item.status !== "respondido");
  const critical = open.filter((item) => item.priority === "critica");
  const unassigned = open.filter((item) => !item.assignee_id);
  const overdue = open.filter((item) => item.due_status === "confirmed" && item.due_at && new Date(item.due_at) < new Date());
  const dueSoon = open.filter((item) => item.due_status === "confirmed" && item.due_at && new Date(item.due_at) >= new Date() && new Date(item.due_at).getTime() - Date.now() < 48 * 3600 * 1000);
  const pendingLegal = open.filter((item) => item.due_status === "pending_validation");
  const withFirst = caseRows.filter((item) => item.first_response_at && item.received_at);
  const avgFirst = withFirst.length ? Math.round(withFirst.reduce((sum, item) => sum + (new Date(item.first_response_at!).getTime() - new Date(item.received_at).getTime()), 0) / withFirst.length / 3600000) : null;
  const timed = withFirst.filter((item) => item.due_status === "confirmed" && item.due_at);
  const onTime = timed.filter((item) => new Date(item.first_response_at!) <= new Date(item.due_at!));
  const onTimePct = timed.length ? Math.round((onTime.length / timed.length) * 100) : null;
  const automatic = rows.filter((item) => item.classification_source === "automatic").length;

  const byDay = new Map<string, { value: number; critical: number }>();
  for (const row of rows) {
    const key = dayKey(row.received_at, session.timezone);
    const current = byDay.get(key) || { value: 0, critical: 0 };
    current.value += 1;
    if (row.priority === "critica") current.critical += 1;
    byDay.set(key, current);
  }
  const points = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-21)
    .map(([key, value]) => ({ label: key.slice(5).replace("-", "/"), value: value.value, critical: value.critical }));

  const statusSlices: Slice[] = Object.entries(
    caseRows.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([status, value]) => ({ label: STATUS_LABEL[status] || status, value, color: STATUS_COLOR[status] || "#71717A" }))
    .sort((a, b) => b.value - a.value);

  const categorySlices: Slice[] = [...caseRows.reduce<Map<string, number>>((acc, item) => {
    const name = item.category_id ? categoryName.get(item.category_id) || "Sin nombre" : "Sin clasificar";
    acc.set(name, (acc.get(name) || 0) + 1);
    return acc;
  }, new Map())].map(([label, value], index) => ({ label, value, color: CATEGORY_COLOR[index % CATEGORY_COLOR.length] })).sort((a, b) => b.value - a.value);

  const prioritySlices: Slice[] = PRIORITY_ORDER.map((priority) => ({
    label: PRIORITY_META[priority].label,
    value: open.filter((item) => item.priority === priority).length,
    color: PRIORITY_META[priority].color,
  }));

  const loadSlices: Slice[] = [...open.reduce<Map<string, number>>((acc, item) => {
    const name = item.assignee_id ? personName.get(item.assignee_id) || "Responsable" : "Sin responsable";
    acc.set(name, (acc.get(name) || 0) + 1);
    return acc;
  }, new Map())]
    .map(([label, value]) => ({ label, value, color: label === "Sin responsable" ? "#B91C1C" : "#962D46" }))
    .sort((a, b) => b.value - a.value);

  const riskSlices: Slice[] = [
    { label: "Vencidos con plazo confirmado", value: overdue.length, color: "#B91C1C" },
    { label: "Vencen en 48 horas", value: dueSoon.length, color: "#B45309" },
    { label: "Plazo legal aún sin validar", value: pendingLegal.length, color: "#1D4ED8" },
    { label: "Sin responsable", value: unassigned.length, color: "#7D2339" },
  ];

  return (
    <div>
      <PageHeader title="Tablero de gestión" description={`Lectura del buzón de ${session.orgName}. Horarios en ${session.timezone}.`} />
      <form className="mb-5 flex flex-wrap items-end gap-2 text-sm">
        <label className="text-xs font-semibold text-muted">Correos desde
          <input className="mt-1 block h-10 rounded-lg border border-line bg-white px-3" type="date" name="desde" defaultValue={params.desde?.slice(0, 10) || ""} />
        </label>
        <button className="h-10 rounded-lg bg-primary px-4 font-semibold text-white" type="submit">Actualizar periodo</button>
      </form>
      {rows.length === 0 && caseRows.length === 0 ? (
        <EmptyState title="Sin comunicaciones en el periodo" body="Los indicadores aparecen cuando el buzón tiene correos o casos en el rango elegido." action={<Link className="text-sm font-semibold text-primary" href="/bandeja">Ir a la bandeja</Link>} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Casos abiertos" value={String(open.length)} hint={`${critical.length} en prioridad crítica`} tone="primary" href="/casos" />
            <Metric label="Vencidos" value={String(overdue.length)} hint={`${dueSoon.length} vencen en las próximas 48 h`} tone="danger" href="/casos?vencimiento=vencido" />
            <Metric label="Sin responsable" value={String(unassigned.length)} hint="Quedaron fuera de cupo o de disponibilidad" tone="warning" href="/casos?sinAsignar=1" />
            <Metric label="Dentro del plazo" value={onTimePct === null ? "—" : `${onTimePct} %`} hint={avgFirst === null ? "Sin primera atención registrada" : `Primera atención promedio: ${avgFirst} h. Solo plazos confirmados.`} tone="success" href="/casos" />
          </div>
          <Volume title="Entrada de comunicaciones" points={points} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Donut title="Estado de los casos" subtitle="Dónde está detenido el trabajo del periodo completo, no solo del filtro de fechas." slices={statusSlices} />
            <Bars title="Riesgo operativo" subtitle="Los plazos legales sin confirmación no se cuentan como vencidos." slices={riskSlices} />
            <Bars title="Carga por categoría" subtitle="Tutelas y notificaciones concentran el riesgo jurídico." slices={categorySlices} />
            <Bars title="Prioridad de lo abierto" subtitle="La crítica sale de la política de la categoría, no de un umbral inventado." slices={prioritySlices} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Bars title="Carga por responsable" subtitle="Casos que todavía no están respondidos ni cerrados." slices={loadSlices} />
            <section className="rounded-2xl border border-line bg-white p-5 shadow-float">
              <h2 className="text-sm font-semibold">Clasificación del periodo</h2>
              <p className="mt-1 text-xs text-faint">De {rows.length} correos recibidos desde el filtro.</p>
              <p className="mt-6 text-4xl font-bold text-primary">{rows.length ? Math.round((automatic / rows.length) * 100) : 0}%</p>
              <p className="mt-1 text-sm text-muted">quedó clasificado por el motor, con el motivo guardado en cada correo.</p>
              <p className="mt-4 text-sm">{rows.length - automatic} requirieron una decisión manual o siguen sin categoría.</p>
              <Link className="mt-5 inline-flex text-sm font-semibold text-primary" href="/bandeja">Revisar la bandeja</Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
