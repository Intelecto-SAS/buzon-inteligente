import { acceptInvitation } from "@/server/actions";
import { Button } from "@/components/ui";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Aceptar invitación</h1>
      <p className="mt-2 text-sm text-muted">Inicie sesión con el correo invitado y confirme. El enlace deja de servir después de aceptarse.</p>
      <form action={acceptInvitation} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <Button type="submit">Aceptar</Button>
      </form>
    </main>
  );
}
