"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";
import { AuthLink, AuthScreen } from "@/components/auth-screen";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setPending(true);
    const { error: signError } = await supabase.auth.signUp({
      email: String(form.get("email") || ""),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: String(form.get("name") || "") },
      },
    });
    setPending(false);
    if (signError) setError(signError.message);
    else setInfo("Cuenta creada. Si el proyecto exige confirmación, abra el enlace del correo. Ese enlace vuelve a este mismo sitio.");
  }

  return (
    <AuthScreen
      title="Crear acceso"
      subtitle="El primer administrador de la organización se habilita después, con el alta inicial."
      footer={
        <p>
          ¿Ya tiene cuenta? <AuthLink href="/login">Iniciar sesión</AuthLink>
        </p>
      }
    >
      <form onSubmit={signUp} className="space-y-4">
        <Field label="Nombre">
          <input className={`${inputClass} h-11 px-3`} name="name" autoComplete="name" required />
        </Field>
        <Field label="Correo">
          <input className={`${inputClass} h-11 px-3`} name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres.">
          <input className={`${inputClass} h-11 px-3`} name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirmar contraseña">
          <input className={`${inputClass} h-11 px-3`} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        {error ? <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
        {info ? <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success" role="status">{info}</p> : null}
        <Button className="h-11 w-full rounded-lg" disabled={pending} type="submit">{pending ? "Creando…" : "Crear cuenta"}</Button>
      </form>
    </AuthScreen>
  );
}
