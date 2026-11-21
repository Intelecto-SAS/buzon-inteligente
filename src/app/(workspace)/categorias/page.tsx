import { saveCategory, setCategoryActive, evaluateSample } from "@/server/actions";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { Button, EmptyState, Field, inputClass, PageHeader } from "@/components/ui";
import { EvaluateForm } from "./evaluate-form";

export default async function CategoriesPage() {
  const session = await getSession();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("categories").select("*, category_expressions(id, text, field, polarity, match_mode, weight, active)").eq("org_id", session.orgId).order("sort_order");
  const admin = canManageConfiguration(session.role!);
  return (
    <div>
      <PageHeader title="Categorías y palabras" description="Las pestañas de la bandeja usan las categorías activas. Desactivar una categoría no borra el historial." />
      {(data || []).length === 0 ? <EmptyState title="No hay categorías" body="Cree la primera categoría. Las expresiones sugeridas para tutelas son una ayuda editable, no una clasificación automática previa." /> : null}
      <ul className="mb-6 space-y-3">
        {(data || []).map((item) => (
          <li key={item.id} className="rounded-container border border-line bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-muted">{item.description} · prioridad {item.default_priority} · {item.active ? "activa" : "inactiva"}{item.sensitive_legal ? " · política jurídica sensible" : ""}</p>
              </div>
              {admin ? (
                <form action={setCategoryActive.bind(null, item.id, !item.active)}>
                  <Button variant="secondary" type="submit">{item.active ? "Desactivar" : "Activar"}</Button>
                </form>
              ) : null}
            </div>
            <ul className="mt-2 text-muted">
              {(item.category_expressions as { id: string; polarity: string; field: string; match_mode: string; weight: number; text: string }[]).map((expression) => (
                <li key={expression.id}>{expression.polarity} · {expression.field} · {expression.match_mode} · peso {expression.weight}: {expression.text}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {admin ? (
        <form action={saveCategory} className="grid gap-3 rounded-container border border-line bg-white p-4 md:grid-cols-2">
          <Field label="Nombre"><input className={inputClass} name="name" required /></Field>
          <Field label="Prioridad inicial"><select className={inputClass} name="priority"><option value="critica">Crítica</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="baja">Baja</option></select></Field>
          <Field label="Descripción"><input className={inputClass} name="description" /></Field>
          <Field label="Horas internas de primera atención"><input className={inputClass} name="hours" type="number" min={1} /></Field>
          <Field label="Puntaje mínimo"><input className={inputClass} name="minScore" type="number" defaultValue={1} /></Field>
          <Field label="Combinación"><select className={inputClass} name="operator"><option value="or">Cualquiera (O)</option><option value="and">Todas (Y)</option></select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sensitive" /> Política de comunicación jurídica sensible</label>
          <Field label="Expresiones" hint="Una por línea: include|subject|phrase|2|acción de tutela. La exclusión usa exclude.">
            <textarea className="min-h-28 w-full rounded-control border border-line p-2 text-sm" name="expressions" placeholder={"include|subject|phrase|2|acción de tutela\nexclude|body|word|1|revista"} />
          </Field>
          <Button type="submit">Guardar categoría</Button>
        </form>
      ) : null}
      <EvaluateForm action={evaluateSample} />
    </div>
  );
}
