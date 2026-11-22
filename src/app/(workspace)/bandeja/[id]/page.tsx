import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { classifyManually, markRead } from "@/server/actions";
import { categories } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const supabase = await createUserClient();
  const { data: message } = await supabase!.from("messages").select("*, categories(name), classification_results(explanation, detail, source, created_at), message_participants(kind, address, name), attachments(id, filename, content_type, size_bytes), ai_analyses(result, model, available)").eq("id", id).maybeSingle();
  if (!message) notFound();
  const cats = await categories(session.orgId!);
  const ai = (message.ai_analyses as { result?: { note?: string; summary?: string }; available?: boolean }[] | null)?.[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="rounded-container border border-line bg-white p-5">
        <PageHeader title={message.subject} description="Contenido del proveedor, sanitizado para visualización." />
        <p className="text-sm">De {message.from_name} &lt;{message.from_address}&gt;</p>
        <p className="text-sm text-muted">{new Date(message.received_at).toLocaleString("es-CO", { timeZone: session.timezone })}</p>
        <ul className="mt-2 text-sm text-muted">
          {(message.message_participants as { kind: string; address: string }[]).map((item, index) => <li key={index}>{item.kind}: {item.address}</li>)}
        </ul>
        {message.body_html_sanitized ? (
          <div className="prose mt-4 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: message.body_html_sanitized }} />
        ) : (
          <p className="mt-4 whitespace-pre-wrap text-sm">{message.body_text}</p>
        )}
        <h2 className="mt-6 text-sm font-semibold">Adjuntos</h2>
        {(message.attachments as { filename: string; size_bytes: number }[]).length === 0 ? <p className="text-sm text-muted">Sin adjuntos registrados.</p> : (
          <ul className="text-sm">{(message.attachments as { filename: string; size_bytes: number }[]).map((item) => <li key={item.filename}>{item.filename} ({item.size_bytes} bytes). La descarga exige el archivo en Storage, que se completa al sincronizar el binario.</li>)}</ul>
        )}
        <form action={markRead.bind(null, message.id, true)} className="mt-4"><button className="text-sm text-primary" type="submit">Marcar como leído</button></form>
      </article>
      <aside className="space-y-3">
        <section className="rounded-container border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Clasificación de la aplicación</h2>
          <p className="mt-2">{(message.categories as { name?: string } | null)?.name || "Sin clasificar"}</p>
          {message.priority ? <Badge tone={message.priority === "critica" ? "danger" : "neutral"}>{message.priority}</Badge> : null}
          <p className="mt-2 text-muted">{message.classification_explanation}</p>
          <p className="mt-2 text-xs text-faint">Origen: {message.classification_source}. {message.classification_locked ? "La decisión manual queda protegida frente a reclasificaciones." : ""}</p>
        </section>
        <section className="rounded-container border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Inteligencia artificial</h2>
          {ai?.available ? <p className="mt-2">{ai.result?.summary}</p> : <p className="mt-2 text-muted">{ai?.result?.note || "Sin análisis. El motor de reglas no depende de este resultado."}</p>}
        </section>
        <form action={classifyManually} className="rounded-container border border-line bg-white p-4 text-sm">
          <input type="hidden" name="messageId" value={message.id} />
          <label className="block font-semibold">Clasificar manualmente
            <select className="mt-2 h-9 w-full rounded-control border border-line" name="categoryId">
              {cats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {cats.length === 0 ? <EmptyState title="Sin categorías" body="Cree una categoría antes de clasificar manualmente." /> : <button className="mt-3 h-9 rounded-control bg-primary px-3 text-white" type="submit">Guardar decisión</button>}
        </form>
        {message.case_id ? <a className="block text-sm font-semibold text-primary" href={`/casos/${message.case_id}`}>Abrir tarea</a> : null}
      </aside>
    </div>
  );
}
