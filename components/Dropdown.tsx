"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Option {
  value: string;
  label: string;
  render?: React.ReactNode; // optional richer label (e.g. favicon)
}

function usePopover() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const triggerCls =
  "flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface px-3 text-sm text-foreground transition-colors hover:border-[var(--border-strong)] focus-ring";
const panelCls =
  "absolute left-0 top-[calc(100%+6px)] z-40 w-[230px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl animate-in";

/* ---------------- Single select ---------------- */
export function SingleSelect({
  value, onChange, options, className, width = 170,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  width?: number;
}) {
  const { open, setOpen, ref } = usePopover();
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" className={cn(triggerCls, "w-full justify-between")} onClick={() => setOpen((o) => !o)}>
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-muted-2 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={panelCls} style={{ width }}>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
                  o.value === value ? "text-foreground" : "text-muted",
                )}
              >
                <span className="truncate">{o.render ?? o.label}</span>
                {o.value === value && <Check size={14} className="shrink-0 text-[var(--accent)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Multi select ---------------- */
export function MultiSelect({
  label, selected, onToggle, onClear, options, searchable, width = 240, className,
}: {
  label: string;
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  options: Option[];
  searchable?: boolean;
  width?: number;
  className?: string;
}) {
  const { open, setOpen, ref } = usePopover();
  const [q, setQ] = React.useState("");
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const count = selected.length;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(triggerCls, count > 0 && "border-[var(--accent)] text-foreground")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label}</span>
        {count > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--accent-foreground)] tnum">
            {count}
          </span>
        )}
        <ChevronDown size={14} className={cn("shrink-0 text-muted-2 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={panelCls} style={{ width }}>
          {searchable && (
            <div className="relative border-b border-[var(--border)] p-2">
              <Search size={13} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-2" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-[var(--border)] bg-background pl-7 pr-2 text-xs text-foreground focus-ring"
              />
            </div>
          )}
          <div className="max-h-[260px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-xs text-muted-2">No matches</div>
            ) : (
              filtered.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => onToggle(o.value)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2"
                  >
                    <span className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border",
                      on ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border-strong)]",
                    )}>
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className={cn("truncate", on && "text-foreground")}>{o.render ?? o.label}</span>
                  </button>
                );
              })
            )}
          </div>
          {count > 0 && (
            <button
              onClick={onClear}
              className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--border)] py-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X size={12} /> Clear {count} selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}
