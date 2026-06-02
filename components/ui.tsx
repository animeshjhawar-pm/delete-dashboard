"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { faviconForProject } from "@/lib/projects";
import { getProjectDomain } from "@/lib/client/domains";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function InfoDot({ text }: { text: string }) {
  // Real hover/focus tooltip (native title was unreliable). Shown via CSS on
  // group-hover and on keyboard focus for accessibility.
  return (
    <span className="group/info relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-grid h-4 w-4 cursor-help place-items-center rounded-full text-muted-2 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-50 w-60 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 text-[11px] font-normal leading-snug text-muted opacity-0 shadow-xl transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function SectionTitle({
  title, subtitle, right, info,
}: { title: string; subtitle?: string; right?: React.ReactNode; info?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {title}
          {info && <InfoDot text={info} />}
        </h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Button({
  className, variant = "default", size = "md", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "accent";
  size?: "sm" | "md" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-3.5 text-sm",
        size === "icon" && "h-9 w-9",
        variant === "default" && "bg-surface-2 text-foreground hover:bg-[var(--border)] border border-[var(--border)]",
        variant === "outline" && "border border-[var(--border-strong)] text-foreground hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:text-foreground hover:bg-surface-2",
        variant === "accent" && "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className, tone = "default", children,
}: { className?: string; tone?: "default" | "accent" | "success" | "warning" | "critical" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "default" && "bg-surface-2 text-foreground border border-[var(--border)]",
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "success" && "text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)]",
        tone === "warning" && "text-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        tone === "critical" && "text-[var(--critical)] bg-[color-mix(in_srgb,var(--critical)_14%,transparent)]",
        tone === "muted" && "bg-surface-2 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Select({
  value, onChange, options, placeholder, className, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      {icon && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-2">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-surface pr-8 text-sm text-foreground focus-ring cursor-pointer",
          icon ? "pl-8" : "pl-3",
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
    </div>
  );
}

export function ProjectBadge({ project, domain, size = 16 }: { project: string | null; domain?: string | null; size?: number }) {
  const [err, setErr] = React.useState(false);
  const resolvedDomain = domain ?? getProjectDomain(project);
  const src = project ? faviconForProject(project, 64, resolvedDomain) : null;
  if (!project) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-surface-2 text-[9px] font-bold text-muted-2 border border-[var(--border)]"
        style={{ width: size, height: size }}
      >
        {src && !err ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" width={size} height={size} onError={() => setErr(true)} className="h-full w-full object-contain" />
        ) : (
          project[0]?.toUpperCase()
        )}
      </span>
      <span className="truncate">{project}</span>
    </span>
  );
}

export function UserChip({ user }: { user: string | null }) {
  if (!user) return <span className="text-muted">—</span>;
  const isBot = user.includes("system") || user.includes("bot") || user.includes("auto");
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
          isBot ? "bg-surface-2 text-muted-2 border border-[var(--border)]" : "bg-[var(--accent-soft)] text-[var(--accent)]",
        )}
      >
        {isBot ? "⚙" : initials(user)}
      </span>
      <span className="truncate">{user.split("@")[0]}</span>
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

export const CHART_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
  "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)",
];

// Stable color per lifecycle status, so pills / donut / chips all agree.
const LIFECYCLE_COLORS: Record<string, string> = {
  "Yet to be Generated": "var(--chart-5)", // blue
  "Generated": "var(--chart-4)", // turquoise
  "Unpublished & Deleted": "var(--chart-2)", // red
  "No Products Tagged": "var(--chart-6)", // gold/amber
  "Published & Deleted": "var(--chart-1)", // yellow
};
export function lifecycleColor(status: string): string {
  return LIFECYCLE_COLORS[status] ?? "var(--chart-8)";
}

export function StatusPill({
  status, count, onClick, dimmed,
}: { status: string; count?: number; onClick?: () => void; dimmed?: boolean }) {
  const c = lifecycleColor(status);
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-opacity",
        onClick && "cursor-pointer hover:opacity-90 focus-ring",
        dimmed && "opacity-35 grayscale",
      )}
      style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {status}{count != null && <span className="tnum opacity-70">×{count}</span>}
    </Tag>
  );
}

// Distinct color per category for lists that can grow unbounded (users,
// clients). Golden-angle hue rotation guarantees no repetition no matter how
// many items appear; saturation/lightness chosen to read on both themes.
export function categoricalColor(i: number): string {
  const hue = (i * 137.508 + 24) % 360;
  return `hsl(${hue.toFixed(1)} 62% 55%)`;
}
