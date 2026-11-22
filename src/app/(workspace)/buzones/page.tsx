import { grantMailbox, pauseMailbox } from "@/server/actions";
import { integrationStatus } from "@/lib/env";
import { getSession } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { canManageConfiguration } from "@/lib/security/permissions";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import Link from "next/link";
import { humanize } from "@/lib/labels";

const TONE = { connected: "success", syncing: "info", error: "danger", paused: "warning", authorization_required: "warning", disconnected: "neutral" } as const;

export default async function MailboxesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const session = await getSession();
  const supabase = await createUserClient();
  const { data } = await supabase!.from("mailboxes").select("id, display_name, email_address, provider, status, last_sync_at, last_error, processing_enabled").eq("org_id", session.orgId);
  const { data: errors } = await supabase!.from("connection_errors").select("id, message, created_at, mailbox_id").eq("org_id", session.orgId).order("created_at", { ascending: false }).limit(20);
  const status = integrationStatus();
  const admin = canManageConfiguration(session.role!);
  const { data: members } = await supabase!.from("memberships").select("user_id, profiles(full_name)").eq("org_id", session.orgId);
  return (
    <div>
      <PageHeader title="Buzones conectados" description="La conexión queda verificada solo después de que el proveedor entrega el perfil del buzón." />
      {params.error ? <p className="mb-3 text-sm text-danger" role="alert">La autorización no se completó ({params.error}).</p> : null}
      {params.conectado ? <p className="mb-3 text-sm text-success" role="status">El proveedor confirmó el buzón.</p> : null}
      <ul className="mb-4 text-sm text-muted">
        <li>Microsoft 365: {status.microsoft ? "credenciales de aplicación presentes" : "faltan MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET"}.</li>
        <li>Gmail: {status.google ? "credenciales presentes" : "faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET"}.</li>
        <li>Pub/Sub: {status.googlePubsub ? "tema configurado" : "falta GOOGLE_PUBSUB_TOPIC"}.</li>
        <li>Inngest: {status.inngest ? "claves presentes" : "faltan INNGEST_EVENT_KEY e INNGEST_SIGNING_KEY. Sin ellas no hay procesamiento con la aplicación cerrada"}.</li>
      </ul>
      {(data || []).length === 0 ? <EmptyState title="Ningún buzón vinculado" body="Inicie la autorización OAuth del proveedor. No se solicitan contraseñas del buzón en este formulario." /> : (
        <ul className="space-y-3">
          {(data || []).map((mailbox) => (
            <li key={mailbox.id} className="rounded-container border border-line bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{mailbox.display_name}</p>
                <Badge tone={TONE[mailbox.status as keyof typeof TONE] || "neutral"}>{humanize(mailbox.status)}</Badge>
              </div>
              <p>{mailbox.email_address} · {mailbox.provider}</p>
              <p className="text-muted">Última sincronización: {mailbox.last_sync_at ? new Date(mailbox.last_sync_at).toLocaleString("es-CO", { timeZone: session.timezone }) : "aún no ocurre"}</p>
              {mailbox.last_error ? <p className="text-danger">{mailbox.last_error}</p> : null}
              {admin ? (
                <div className="mt-2 flex gap-2">
                  <form action={pauseMailbox.bind(null, mailbox.id, mailbox.processing_enabled)}><Button variant="secondary" type="submit">{mailbox.processing_enabled ? "Pausar" : "Reanudar"}</Button></form>
                </div>
              ) : null}
              {admin ? (
                <form action={grantMailbox} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="mailboxId" value={mailbox.id} />
                  <select className="h-9 rounded-control border border-line px-2" name="userId">{(members || []).map((member) => <option key={member.user_id} value={member.user_id}>{(member.profiles as { full_name?: string } | null)?.full_name}</option>)}</select>
                  <label className="text-xs"><input type="checkbox" name="reply" /> Responder</label>
                  <label className="text-xs"><input type="checkbox" name="forward" /> Reenviar</label>
                  <Button variant="secondary" type="submit">Otorgar acceso</Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {admin ? (
        <div className="mt-4 flex gap-3">
          <Link className="inline-flex h-9 items-center rounded-control bg-primary px-3 text-sm text-white" href="/api/mailboxes/microsoft/start">Conectar Microsoft 365</Link>
          <Link className="inline-flex h-9 items-center rounded-control border border-line px-3 text-sm" href="/api/mailboxes/google/start">Conectar Gmail</Link>
        </div>
      ) : null}
      <h2 className="mb-2 mt-8 text-sm font-semibold">Errores de conexión</h2>
      {(errors || []).length === 0 ? <p className="text-sm text-muted">Sin errores registrados.</p> : <ul className="text-sm">{(errors || []).map((error) => <li key={error.id}>{error.message}</li>)}</ul>}
    </div>
  );
}
