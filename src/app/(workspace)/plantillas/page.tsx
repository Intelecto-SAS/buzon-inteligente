import { saveTemplate } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration, canMutateModule } from "@/lib/security/permissions";
import { Button, EmptyState, Field, inputClass, PageHeader } from "@/components/ui";

export default async function TemplatesPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("templates").select("*, template_versions(version, subject, body)").eq("org_id", session.orgId);
  const canEdit = canManageConfiguration(session.role!) || canMutateModule(session.role!, "plantillas");
  return (
    <div>
      <PageHeader title="Plantillas de respuesta" description="Un acuse no afirma que el trámite fue radicado o resuelto. Los asuntos jurídicos sensibles exigen aprobación." />
      {(data || []).length === 0 ? <EmptyState title="No hay plantillas" body="Cree un acuse o una respuesta informativa. El envío real usa el buzón conectado y registra el resultado del proveedor." /> : (
        <ul className="space-y-2 text-sm">{(data || []).map((item) => <li key={item.id} className="rounded-container border border-line bg-white p-4"><span className="font-semibold">{item.name}</span> · {item.kind} · {item.requires_approval ? "requiere aprobación" : "bajo riesgo autorizado"}</li>)}</ul>
      )}
      {canEdit ? (
        <form action={saveTemplate} className="mt-4 grid gap-3 rounded-container border border-line bg-white p-4">
          <Field label="Nombre"><input className={inputClass} name="name" required /></Field>
          <Field label="Tipo"><select className={inputClass} name="kind"><option value="acuse">Acuse</option><option value="informativa">Informativa</option><option value="solicitud_informacion">Solicitud de información</option><option value="cierre">Cierre</option></select></Field>
          <Field label="Asunto"><input className={inputClass} name="subject" /></Field>
          <Field label="Cuerpo"><textarea className="min-h-28 w-full rounded-control border border-line p-2 text-sm" name="body" defaultValue="Recibimos su comunicación «{{asunto}}». Este mensaje confirma la recepción en {{organizacion}} y no implica admisión, radicación oficial ni decisión de fondo. Identificador interno: {{codigo_caso}}." /></Field>
          <label className="text-sm"><input type="checkbox" name="approval" defaultChecked /> Exigir aprobación antes del envío</label>
          <Button type="submit">Guardar plantilla</Button>
        </form>
      ) : null}
    </div>
  );
}
