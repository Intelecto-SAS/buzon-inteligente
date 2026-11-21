"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";

export default function RecoverPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase no está configurado.");
      return;
    }
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` });
    setMessage(error ? error.message : "Si el correo existe, Supabase enviará el enlace de recuperación.");
  }
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Field label="Correo"><input className={inputClass} type="email" name="email" required /></Field>
        <Button type="submit">Enviar enlace</Button>
        {message ? <p className="text-sm text-muted" role="status">{message}</p> : null}
      </form>
    </main>
  );
}
