export const dynamic = "force-dynamic";

import { createOrganization } from "@/server/actions";
import { Button, Field, inputClass, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session.configured) redirect("/");
  if (!session.userId) redirect("/login");
  if (session.orgId) redirect("/dashboard");
  const enabled = process.env.BOOTSTRAP_ENABLED === "true";
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <PageHeader title="Organización" description="El primer acceso administrativo se crea aquí, sin credenciales fijas en el código." />
      {enabled ? (
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
