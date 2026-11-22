import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui";
import { getSession } from "@/lib/session";
import { categories, inboxMessages, tabCounts } from "@/lib/queries";
import { createUserClient } from "@/lib/supabase/server";
import Link from "next/link";
import { humanize } from "@/lib/labels";
import { saveView } from "@/server/actions";

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await getSession();
  const cats = await categories(session.orgId!);
  const active = cats.filter((item) => item.active);
  const counts = await tabCounts(session.orgId!);
  const page = Number(params.page || 0);
  const tab = params.categoria || "todos";
  const { rows, total } = await inboxMessages(session, { ...params, categoria: tab }, page);
  const supabase = await createUserClient();
  const { data: mailboxes } = await supabase!.from("mailboxes").select("id, display_name").eq("org_id", session.orgId);
  const { data: reads } = await supabase!.from("read_states").select("message_id").eq("user_id", session.userId);
  const readIds = new Set((reads || []).map((item) => item.message_id));
  function countFor(id: string | null, mode: "open" | "unread") {
    return counts.filter((item) => {
      const match = id === "criticos" ? item.priority === "critica" : id === "sin" ? !item.category_id : id === "todos" ? true : item.category_id === id;
      if (!match) return false;
      if (mode === "unread") return !readIds.has(item.id);
      return true;
    }).length;
  }
  const tabs = [
    { id: "todos", name: "Todos" },
    { id: "criticos", name: "Críticos" },
    { id: "sin", name: "Sin clasificar" },
    ...active.map((item) => ({ id: item.id, name: item.name, priority: item.default_priority })),
  ];
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value && key !== "page") query.set(key, value);
  return (
    <div>
      <PageHeader title="Bandeja inteligente" description="Las pestañas salen de las categorías activas. El conteo incluye comunicaciones que no están cerradas." />
      <div className="tabs" role="tablist" aria-label="Categorías">
        {tabs.map((item) => {
          const next = new URLSearchParams(query);
          next.set("categoria", item.id);
          next.delete("page");
          return (
            <Link key={item.id} href={`/bandeja?${next}`} aria-current={tab === item.id ? "page" : undefined}>
              {item.name} <span className="text-faint">{countFor(item.id, "open")}</span>
              {countFor(item.id, "unread") > 0 ? <span className="ml-1 text-primary">· {countFor(item.id, "unread")} nuevas</span> : null}
            </Link>
          );
        })}
      </div>
      <form className="my-3 grid gap-2 md:grid-cols-4" method="get">
        <input type="hidden" name="categoria" value={tab} />
        <input className="h-9 rounded-control border border-line px-2 text-sm" name="q" placeholder="Buscar asunto o remitente" defaultValue={params.q || ""} />
        <select className="h-9 rounded-control border border-line px-2 text-sm" name="buzon" defaultValue={params.buzon || ""}>
          <option value="">Buzón</option>
          {(mailboxes || []).map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
        </select>
        <select className="h-9 rounded-control border border-line px-2 text-sm" name="prioridad" defaultValue={params.prioridad || ""}>
          <option value="">Prioridad</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baja">Baja</option>
        </select>
        <select className="h-9 rounded-control border border-line px-2 text-sm" name="origen" defaultValue={params.origen || ""}>
          <option value="">Origen de clasificación</option>
          <option value="automatic">Automática</option>
          <option value="manual">Manual</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sinAsignar" value="1" defaultChecked={params.sinAsignar === "1"} /> Sin asignar</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sinRespuesta" value="1" defaultChecked={params.sinRespuesta === "1"} /> Sin responder</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="adjuntos" value="1" defaultChecked={params.adjuntos === "1"} /> Con adjuntos</label>
        <div className="flex gap-2">
          <button className="h-9 rounded-control bg-primary px-3 text-sm text-white" type="submit">Filtrar</button>
          <Link className="inline-flex h-9 items-center text-sm text-muted" href="/bandeja">Limpiar</Link>
        </div>
      </form>
      <form action={saveView} className="mb-3 flex gap-2">
        {Object.entries(params).map(([key, value]) => value ? <input key={key} type="hidden" name={key} value={value} /> : null)}
        <input className="h-9 rounded-control border border-line px-2 text-sm" name="name" placeholder="Nombre de la vista" />
        <button className="h-9 rounded-control border border-line px-3 text-sm" type="submit">Guardar vista</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No hay comunicaciones con estos filtros" body={mailboxes?.length ? "Cuando el buzón reciba correos y el procesamiento los clasifique, aparecerán en esta tabla." : "Conecte un buzón y autorice su sincronización. La bandeja no usa correos de ejemplo."} />
      ) : (
        <Panel>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Prioridad</th><th>Lectura</th><th>Remitente</th><th>Asunto</th><th>Categoría</th><th>Buzón</th><th>Estado</th><th>Recepción</th><th>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const category = row.categories as { name?: string } | null;
                  const mailbox = row.mailboxes as { display_name?: string } | null;
                  return (
                    <tr key={row.id}>
                      <td>{row.priority ? <Badge tone={row.priority === "critica" ? "danger" : row.priority === "alta" ? "warning" : "neutral"}>{humanize(row.priority)}</Badge> : "—"}</td>
                      <td>{readIds.has(row.id) ? "Leído" : "Nuevo"}</td>
                      <td>{row.from_name || row.from_address}</td>
                      <td><Link className="font-semibold text-ink" href={`/bandeja/${row.id}`}>{row.subject}</Link><p className="text-faint">{row.snippet}</p></td>
                      <td>{category?.name || "Sin clasificar"}</td>
                      <td>{mailbox?.display_name}</td>
                      <td>{humanize(row.management_status)}</td>
                      <td>{new Date(row.received_at).toLocaleString("es-CO", { timeZone: session.timezone })}</td>
                      <td>{row.due_status === "confirmed" && row.due_at ? new Date(row.due_at).toLocaleString("es-CO", { timeZone: session.timezone }) : "Pendiente de validación"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-sm text-muted">
            <span>{total} registros</span>
            <span>
              {page > 0 ? <Link href={`/bandeja?${query}&page=${page - 1}`}>Anterior</Link> : null}
              {total > (page + 1) * 25 ? <Link className="ml-3" href={`/bandeja?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) })}`}>Siguiente</Link> : null}
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}
