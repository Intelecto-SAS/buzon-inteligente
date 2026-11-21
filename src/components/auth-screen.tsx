import Link from "next/link";
import type { ReactNode } from "react";

export function AuthScreen({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-primary px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Superintendencia de Sociedades</p>
          <h1 className="mt-6 max-w-md text-4xl font-bold leading-tight tracking-tight">Buzón Inteligente</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">Clasificación, enrutamiento y plazos de las comunicaciones institucionales, con el responsable y la alerta ya definidos.</p>
        </div>
        <ul className="relative space-y-3 text-sm text-white/90">
          <li>Bandeja con motivo de clasificación y prioridad.</li>
          <li>Casos con responsable, vencimiento y trazabilidad.</li>
          <li>Alertas de tutelas, desacatos y plazos vencidos.</li>
        </ul>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-[420px]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary lg:hidden">Buzón Inteligente</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight lg:mt-0">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-float sm:p-8">{children}</div>
          <div className="mt-6 text-sm text-muted">{footer}</div>
        </div>
      </section>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-primary hover:text-primary-hover">
      {children}
    </Link>
  );
}
