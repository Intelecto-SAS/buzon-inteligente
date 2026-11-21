import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white text-ink border border-line hover:bg-canvas",
    ghost: "bg-transparent text-muted hover:bg-[#F3F4F6]",
    danger: "bg-danger text-white",
  }[variant];
  return <button className={`inline-flex h-9 items-center justify-center rounded-control px-3 text-sm font-medium disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-faint ${styles} ${className}`} {...props} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass = "h-9 w-full rounded-control border border-line bg-white px-2 text-sm text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export function Badge({ tone, children }: { tone: "neutral" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const tones = {
    neutral: "bg-[#F3F4F6] text-muted",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
    info: "bg-info-bg text-info",
  }[tone];
  return <span className={`inline-flex h-[22px] items-center rounded px-1.5 text-xs font-medium ${tones}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-container border border-dashed border-line bg-white px-6 py-10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-container border border-line bg-white ${className}`}>{children}</section>;
}

export function SetupNotice({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return (
    <div className="mb-4 rounded-container border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning" role="status">
      Configuración pendiente: {missing.join(", ")}. La aplicación no muestra datos operativos hasta conectar la base.
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="text-sm font-semibold text-primary hover:underline" href={href}>{children}</Link>;
}
