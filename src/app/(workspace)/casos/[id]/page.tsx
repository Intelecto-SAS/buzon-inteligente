import { addNote, assignCase, changePriority, createDraft, decideApproval, transitionCase } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canMutateModule } from "@/lib/security/permissions";
import { notFound } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";
import { humanize } from "@/lib/labels";

export default async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const supabase = await createUserClient();
  const { data: item } = await supabase!.from("cases").select("*, case_notes(id, body, created_at, author_id), case_transitions(from_status, to_status, reason, created_at), drafts(id, subject, status, body)").eq("id", id).maybeSingle();
  if (!item) notFound();
  const { data: members } = await supabase!.from("memberships").select("user_id, profiles(full_name)").eq("org_id", session.orgId).eq("status", "active");
  const editable = canMutateModule(session.role!, "casos");
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-2xl font-bold">{item.public_code}</h1>
        <p className="text-sm text-muted">{item.subject}</p>
        <p className="mt-2 text-sm">Estado {humanize(item.status)} · Prioridad {humanize(item.priority)} · Plazo legal {item.due_status === "confirmed" ? item.due_at : "Pendiente de validación humana"}</p>
        <section className="mt-4 rounded-container border border-line bg-white p-4">
          <h2 className="text-sm font-semibold">Notas internas</h2>
          <ul className="mt-2 space-y-2 text-sm">{(item.case_notes as { id: string; body: string }[]).map((note) => <li key={note.id}>{note.body}</li>)}</ul>
          {editable ? (
            <form action={addNote} className="mt-3 space-y-2">
              <input type="hidden" name="caseId" value={item.id} />
              <textarea className="min-h-20 w-full rounded-control border border-line p-2 text-sm" name="body" required />
              <Button type="submit">Añadir nota</Button>
            </form>
          ) : null}
        </section>
        <section className="mt-4 rounded-container border border-line bg-white p-4 text-sm">
          <h2 className="font-semibold">Historial de estados</h2>
          <ul className="mt-2">{(item.case_transitions as { from_status: string; to_status: string; reason: string; created_at: string }[]).map((row, index) => <li key={index}>{humanize(row.from_status)} → {humanize(row.to_status)}. {row.reason}</li>)}</ul>
        </section>
      </div>
      {editable ? (
        <div className="space-y-3">
          <form action={assignCase} className="rounded-container border border-line bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <Field label="Responsable">
              <select className={inputClass} name="assignee">
                <option value="">Sin responsable</option>
                {(members || []).map((member) => <option key={member.user_id} value={member.user_id}>{(member.profiles as { full_name?: string } | null)?.full_name || member.user_id}</option>)}
              </select>
            </Field>
            <Field label="Motivo"><input className={inputClass} name="reason" /></Field>
            <Button className="mt-2" type="submit">Asignar</Button>
          </form>
          <form action={changePriority} className="rounded-container border border-line bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <Field label="Prioridad"><select className={inputClass} name="priority" defaultValue={item.priority}><option value="critica">Crítica</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="baja">Baja</option></select></Field>
            <Field label="Justificación"><input className={inputClass} name="reason" /></Field>
            <Button className="mt-2" variant="secondary" type="submit">Actualizar prioridad</Button>
          </form>
          <form action={transitionCase} className="rounded-container border border-line bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <Field label="Nuevo estado"><select className={inputClass} name="to"><option value="en_gestion">En gestión</option><option value="pendiente_informacion">Pendiente de información</option><option value="pendiente_aprobacion">Pendiente de aprobación</option><option value="respondido">Respondido</option><option value="cerrado">Cerrado</option><option value="reabierto">Reabierto</option></select></Field>
            <Field label="Motivo"><input className={inputClass} name="reason" /></Field>
            <Button className="mt-2" variant="secondary" type="submit">Registrar transición</Button>
          </form>
          <form action={createDraft} className="rounded-container border border-line bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <input type="hidden" name="sensitive" value={item.sensitive_legal ? "1" : "0"} />
            <Field label="Asunto"><input className={inputClass} name="subject" defaultValue={`Re: ${item.subject}`} /></Field>
            <Field label="Cuerpo" hint="Variables: {{remitente}} {{asunto}} {{codigo_tarea}} {{categoria}} {{organizacion}}"><textarea className="min-h-24 w-full rounded-control border border-line p-2" name="body" /></Field>
            <Button className="mt-2" type="submit">{item.sensitive_legal ? "Enviar a aprobación" : "Guardar borrador"}</Button>
          </form>
          {(item.drafts as { id: string; subject: string; status: string }[]).map((draft) => (
            <form key={draft.id} action={decideApproval} className="rounded-container border border-line bg-white p-4 text-sm">
              <input type="hidden" name="draftId" value={draft.id} />
              <p>{draft.subject} · {humanize(draft.status)}</p>
              {session.role === "administrador" || session.role === "supervisor" ? (
                <div className="mt-2 flex gap-2">
                  <button className="h-9 rounded-control bg-primary px-3 text-white" name="status" value="approved" type="submit">Aprobar</button>
                  <button className="h-9 rounded-control border border-line px-3" name="status" value="rejected" type="submit">Rechazar</button>
                </div>
              ) : <p className="text-muted">Pendiente de un supervisor. El envío al proveedor se hace tras la aprobación y queda registrado en el intento.</p>}
            </form>
          ))}
        </div>
      ) : <p className="text-sm text-muted">Su rol consulta la tarea y no modifica la operación.</p>}
    </div>
  );
}
