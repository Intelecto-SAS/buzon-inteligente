"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    const { error: signError } = await supabase.auth.signUp({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: String(form.get("name") || "") },
      },
    });
    if (signError) setError(signError.message);
    else setInfo("Si el proyecto exige confirmación, abra el enlace del correo. Ese enlace vuelve a este mismo sitio.");
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-6 py-12 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Comunicaciones institucionales</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Buzón Inteligente</h1>
        <p className="mt-3 text-sm text-muted">Clasificación parametrizada, casos, plazos y trazabilidad. El acceso usa Supabase Auth. No existen credenciales embebidas.</p>
      </div>
      <div className="rounded-container border border-line bg-white p-6">
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Correo"><input className={inputClass} name="email" type="email" autoComplete="username" required /></Field>
          <Field label="Contraseña"><input className={inputClass} name="password" type="password" autoComplete="current-password" required /></Field>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          {info ? <p className="text-sm text-muted" role="status">{info}</p> : null}
          <Button disabled={pending} type="submit">{pending ? "Ingresando…" : "Ingresar"}</Button>
        </form>
        <form onSubmit={signUp} className="mt-6 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold">Crear acceso</p>
          <Field label="Nombre"><input className={inputClass} name="name" required /></Field>
          <Field label="Correo"><input className={inputClass} name="email" type="email" required /></Field>
          <Field label="Contraseña"><input className={inputClass} name="password" type="password" minLength={8} required /></Field>
          <Button variant="secondary" type="submit">Registrar cuenta</Button>
        </form>
        <p className="mt-4 text-sm"><Link className="text-primary" href="/recuperar">Recuperar contraseña</Link></p>
      </div>
    </main>
  );
}
