"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ModuleKey, Role } from "@/lib/security/permissions";

const ITEMS: { href: string; key: ModuleKey; label: string }[] = [
  { href: "/dashboard", key: "dashboard", label: "Dashboard" },
  { href: "/bandeja", key: "bandeja", label: "Bandeja inteligente" },
  { href: "/casos", key: "casos", label: "Gestión de casos" },
  { href: "/alertas", key: "alertas", label: "Alertas" },
  { href: "/automatizaciones", key: "automatizaciones", label: "Automatizaciones" },
  { href: "/categorias", key: "categorias", label: "Categorías" },
  { href: "/plantillas", key: "plantillas", label: "Plantillas" },
  { href: "/reportes", key: "reportes", label: "Reportes" },
  { href: "/auditoria", key: "auditoria", label: "Auditoría" },
  { href: "/usuarios", key: "usuarios", label: "Usuarios y equipos" },
  { href: "/buzones", key: "buzones", label: "Buzones conectados" },
  { href: "/configuracion", key: "configuracion", label: "Configuración" },
];

export function Shell({ role, name, org, email, unread, children, modules }: { role: Role; name: string; org: string; email: string; unread: number; modules: ModuleKey[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = ITEMS.filter((item) => modules.includes(item.key));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen">
      {open ? <button className="fixed inset-0 z-30 bg-ink/20" aria-label="Cerrar menú" onClick={() => setOpen(false)} /> : null}
      <nav id="menu-modulos" className={`shell-nav flex flex-col border-r border-line bg-white ${open ? "open" : ""}`} aria-label="Módulos" aria-hidden={!open}>
        <div className="flex items-start justify-between border-b border-line px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Buzón Inteligente</p>
            <p className="mt-1 text-sm font-semibold">{org}</p>
          </div>
          <button className="h-8 rounded-control px-2 text-sm text-muted hover:bg-canvas" type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            Cerrar
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {visible.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className={`block px-4 py-2 text-sm ${active ? "bg-primary font-semibold text-white" : "text-muted hover:bg-canvas"}`}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line bg-white" type="button" aria-expanded={open} aria-controls="menu-modulos" onClick={() => setOpen((value) => !value)}>
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <p className="hidden text-sm text-muted sm:block">Plataforma de gestión de comunicaciones</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/alertas" className="text-muted" aria-label={`Notificaciones, ${unread} sin leer`}>
              Alertas <span className="font-semibold text-ink">{unread}</span>
            </Link>
            <div className="text-right">
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-faint">{roleLabel(role)} · {email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-muted underline" type="submit">Salir</button>
            </form>
          </div>
        </header>
        <main className="px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function roleLabel(role: Role): string {
  return { administrador: "Administrador", supervisor: "Supervisor", usuario: "Usuario", auditor: "Auditor" }[role];
}
