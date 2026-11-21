export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { missingSetup } from "@/lib/env";

export default async function HomePage() {
  const session = await getSession();
  if (!session.configured) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-bold">Buzón Inteligente</h1>
        <p className="mt-3 text-sm text-muted">La base de datos todavía no está configurada. Defina las variables de entorno antes de operar la plataforma.</p>
        <ul className="mt-4 list-disc pl-5 text-sm">
          {missingSetup().map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-4 text-sm"><Link className="text-primary" href="/login">Ir al acceso</Link></p>
      </main>
    );
  }
  if (!session.userId) redirect("/login");
  if (!session.orgId) redirect("/organizacion");
  redirect("/dashboard");
}
