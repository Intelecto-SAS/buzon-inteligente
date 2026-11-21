export const dynamic = "force-dynamic";

import { createOrganization } from "@/server/actions";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session.configured) redirect("/");
  if (!session.userId) redirect("/login");
  if (session.orgId) redirect("/dashboard");
  const enabled = process.env.BOOTSTRAP_ENABLED === "true";
  const supabase = await createUserClient();
  const { error: schemaError } = await supabase.from("organizations").select("id").limit(1);
  const schemaMissing = schemaError?.message?.includes("schema cache") || schemaError?.code === "PGRST205";
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <PageHeader title="Organización" description="El primer acceso administrativo se crea aquí, sin credenciales fijas en el código." />
      {schemaMissing ? (
        <p className="text-sm text-muted">La base todavía no tiene las tablas de la aplicación. En el SQL Editor de Supabase ejecute, en orden, `supabase/migrations/0001_schema.sql` y `supabase/migrations/0002_rls.sql`. Después vuelva a cargar esta página.</p>
      ) : enabled ? (
        <form action={createOrganization} className="space-y-3 rounded-container border border-line bg-white p-6">
          <Field label="Nombre de la organización"><input className={inputClass} name="name" required /></Field>
          <Field label="Su nombre"><input className={inputClass} name="fullName" defaultValue={session.fullName || ""} required /></Field>
          <Button type="submit">Crear organización y quedar como administrador</Button>
        </form>
      ) : (
        <p className="text-sm text-muted">BOOTSTRAP_ENABLED está inactivo. Active esa variable solo para el alta inicial, o acepte una invitación vigente.</p>
      )}
    </main>
  );
}
