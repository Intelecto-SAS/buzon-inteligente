"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";
import { AuthLink, AuthScreen } from "@/components/auth-screen";

export default function RecoverPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email") || "");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` });
    setPending(false);
    if (resetError) setError(resetError.message);
    else setMessage("Si el correo existe, Supabase enviará el enlace de recuperación.");
  }

  return (
    <AuthScreen
      title="Recuperar contraseña"
      subtitle="Enviaremos un enlace al correo para elegir una contraseña nueva."
      footer={<AuthLink href="/login">Volver al inicio de sesión</AuthLink>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Correo">
          <input className={`${inputClass} h-11 px-3`} type="email" name="email" autoComplete="email" required />
        </Field>
        {error ? <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
        {message ? <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success" role="status">{message}</p> : null}
        <Button className="h-11 w-full rounded-lg" disabled={pending} type="submit">{pending ? "Enviando…" : "Enviar enlace"}</Button>
      </form>
    </AuthScreen>
  );
}
