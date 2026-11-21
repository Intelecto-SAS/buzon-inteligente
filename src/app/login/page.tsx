"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";
import { AuthLink, AuthScreen } from "@/components/auth-screen";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setPending(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    });
    setPending(false);
    if (signError) {
      setError("No fue posible iniciar sesión. Verifique el correo y la contraseña.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <AuthScreen
      title="Iniciar sesión"
      subtitle="Use el correo institucional con el que quedó registrada su cuenta."
      footer={
        <p>
          ¿Aún no tiene cuenta? <AuthLink href="/registro">Crear acceso</AuthLink>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Correo">
          <input className={`${inputClass} h-11 px-3`} name="email" type="email" autoComplete="username" placeholder="nombre@supersociedades.gov.co" required />
        </Field>
        <Field label="Contraseña">
          <input className={`${inputClass} h-11 px-3`} name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <AuthLink href="/recuperar">Olvidé mi contraseña</AuthLink>
        </div>
        {error ? <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
        <Button className="h-11 w-full rounded-lg" disabled={pending} type="submit">{pending ? "Ingresando…" : "Ingresar"}</Button>
      </form>
    </AuthScreen>
  );
}
