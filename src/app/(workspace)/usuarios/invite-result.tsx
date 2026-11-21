"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";

export function InviteResult({ action }: { action: (formData: FormData) => Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  return (
    <form className="space-y-2 rounded-container border border-line bg-white p-4" action={async (formData) => setToken((await action(formData)).token)}>
      <Field label="Correo a invitar"><input className={inputClass} type="email" name="email" required /></Field>
      <Field label="Rol"><select className={inputClass} name="role"><option value="usuario">Usuario</option><option value="supervisor">Supervisor</option><option value="auditor">Auditor</option><option value="administrador">Administrador</option></select></Field>
      <Button type="submit">Crear invitación</Button>
      {token ? <p className="text-sm" role="status">Entregue este enlace por un canal institucional: {`/invitar/${token}`}. No se vuelve a mostrar.</p> : null}
    </form>
  );
}
