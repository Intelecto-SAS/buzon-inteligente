export type Slice = { label: string; value: number; color: string; href?: string };

export function Metric({ label, value, hint, tone, href }: { label: string; value: string; hint: string; tone: "primary" | "danger" | "warning" | "success" | "info"; href: string }) {
  const bar = { primary: "bg-primary", danger: "bg-danger", warning: "bg-warning", success: "bg-success", info: "bg-info" }[tone];
  const ink = { primary: "text-primary", danger: "text-danger", warning: "text-warning", success: "text-success", info: "text-info" }[tone];
  return (
    <a href={href} className="relative overflow-hidden rounded-2xl border border-line bg-white px-4 py-4 shadow-float">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} />
      <p className="pl-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 pl-2 text-3xl font-bold tracking-tight ${ink}`}>{value}</p>
      <p className="mt-1 pl-2 text-xs text-faint">{hint}</p>
    </a>
  );
}

export function Donut({ title, subtitle, slices }: { title: string; subtitle: string; slices: Slice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const r = 58;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-float">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-faint">{subtitle}</p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 160 160" className="h-40 w-40" role="img" aria-label={title}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#F3F4F6" strokeWidth="16" />
          {slices.map((slice) => {
            const length = (slice.value / total) * c;
            const dash = `${length} ${c - length}`;
            const node = (
              <circle key={slice.label} cx="80" cy="80" r={r} fill="none" stroke={slice.color} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />
            );
            offset += length;
            return node;
          })}
          <text x="80" y="76" textAnchor="middle" className="fill-ink" fontSize="22" fontWeight="700">{slices.reduce((sum, slice) => sum + slice.value, 0)}</text>
          <text x="80" y="94" textAnchor="middle" className="fill-muted" fontSize="10">tareas</text>
        </svg>
        <ul className="min-w-[180px] flex-1 space-y-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />{slice.label}</span>
              <span className="font-semibold tabular-nums">{slice.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Bars({ title, subtitle, slices, unit }: { title: string; subtitle: string; slices: Slice[]; unit?: string }) {
  const max = Math.max(1, ...slices.map((slice) => slice.value));
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-float">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-faint">{subtitle}</p>
      <ul className="mt-4 space-y-3">
        {slices.map((slice) => (
          <li key={slice.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{slice.label}</span>
              <span className="tabular-nums text-muted">{slice.value}{unit ? ` ${unit}` : ""}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(slice.value ? 4 : 0, (slice.value / max) * 100)}%`, background: slice.color }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Volume({ title, points }: { title: string; points: { label: string; value: number; critical: number }[] }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const w = 640;
  const h = 180;
  const pad = 24;
  const inner = w - pad * 2;
  const barW = points.length ? inner / points.length : inner;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-float">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-faint">El azul es el total del día. El ámbar son comunicaciones críticas.</p>
        </div>
        <p className="text-xs text-muted"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-info" />Total <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />Críticas</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 28}`} className="mt-3 w-full" role="img" aria-label={title}>
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <line key={step} x1={pad} x2={w - pad} y1={h - (h - 12) * step} y2={h - (h - 12) * step} stroke="#E4E4E7" strokeDasharray="3 4" />
        ))}
        {points.map((point, index) => {
          const height = (point.value / max) * (h - 16);
          const critical = (point.critical / max) * (h - 16);
          const x = pad + index * barW + barW * 0.18;
          const width = barW * 0.64;
          const showLabel = points.length <= 10 || index % 2 === 0;
          return (
            <g key={`${point.label}-${index}`}>
              <rect x={x} y={h - height} width={width} height={height} rx="3" fill="#1D4ED8">
                <title>{`${point.label}: ${point.value} correos, ${point.critical} críticos`}</title>
              </rect>
              <rect x={x} y={h - critical} width={width} height={critical} rx="3" fill="#F59E0B" />
              {showLabel ? <text x={x + width / 2} y={h + 16} textAnchor="middle" fontSize="10" fill="#71717A">{point.label}</text> : null}
            </g>
          );
        })}
      </svg>
    </section>
  );
}
