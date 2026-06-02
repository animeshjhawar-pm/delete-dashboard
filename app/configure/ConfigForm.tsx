"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarRange, Check, Database, RotateCcw } from "lucide-react";
import { MONITORING_SINCE } from "@/lib/range";

const DAY = 86400000;

function pad(n: number) { return String(n).padStart(2, "0"); }
// ISO -> value for <input type="datetime-local"> (local time, minute precision)
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v); // interpreted as local time
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const QUICK = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 182 },
  { label: "Last 1 year", days: 365 },
  { label: "Last 2 years", days: 730 },
  { label: "All time", days: 0 }, // from epoch-ish
];

export function ConfigForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = useMemo(() => new Date(), []);

  const initFrom = sp.get("from") ?? MONITORING_SINCE;
  const initTo = sp.get("to") ?? now.toISOString();

  const [from, setFrom] = useState(isoToLocal(initFrom));
  const [to, setTo] = useState(isoToLocal(initTo));
  const [maxRows, setMaxRows] = useState(sp.get("maxRows") ?? "");

  function applyQuick(days: number) {
    const end = new Date();
    const start = days === 0 ? new Date("2020-01-01T00:00:00") : new Date(end.getTime() - days * DAY);
    setFrom(isoToLocal(start.toISOString()));
    setTo(isoToLocal(end.toISOString()));
  }

  function apply() {
    const fromIso = localToIso(from);
    const toIso = localToIso(to);
    const q = new URLSearchParams();
    q.set("range", "custom");
    if (fromIso) q.set("from", fromIso);
    if (toIso) q.set("to", toIso);
    const mr = Number(maxRows);
    if (Number.isFinite(mr) && mr > 0) q.set("maxRows", String(Math.floor(mr)));
    router.push(`/?${q.toString()}`);
  }

  const spanDays = useMemo(() => {
    const a = localToIso(from), b = localToIso(to);
    if (!a || !b) return null;
    return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));
  }, [from, to]);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-8 sm:px-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
          <CalendarRange size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Configure View</h1>
          <p className="text-sm text-muted">Set the deletion (<span className="font-mono text-xs">d_at</span>) window the dashboard analyzes.</p>
        </div>
      </div>

      <div className="card space-y-5 p-5 sm:p-6">
        {/* Quick presets */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Quick windows</div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                onClick={() => applyQuick(q.days)}
                className="rounded-lg border border-[var(--border)] bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-[var(--border-strong)] hover:bg-surface-2 focus-ring"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exact window with date + time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-2">From (deleted at ≥)</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-surface px-3 text-sm text-foreground focus-ring"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-2">To (deleted at ≤)</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-surface px-3 text-sm text-foreground focus-ring"
            />
          </label>
        </div>

        {/* Advanced: row cap */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
            <Database size={12} /> Max rows (advanced)
          </div>
          <input
            type="number"
            min={1}
            placeholder="Default 50000"
            value={maxRows}
            onChange={(e) => setMaxRows(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-surface px-3 text-sm text-foreground focus-ring sm:w-[260px]"
          />
          <p className="mt-1.5 text-xs text-muted-2">Safety cap on deletions pulled per window. Raise for very wide windows; leave blank for the default.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <div className="text-xs text-muted">
            {spanDays != null ? <>Window spans <span className="font-semibold text-foreground tnum">{spanDays.toLocaleString()}</span> day{spanDays === 1 ? "" : "s"}.</> : "Pick a valid range."}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/?range=since")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-ring"
            >
              <RotateCcw size={14} /> Reset to default window
            </button>
            <button
              onClick={apply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90 focus-ring"
            >
              <Check size={15} /> Apply &amp; view dashboard
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-2">
        The dashboard queries <span className="font-mono">clusters</span> where <span className="font-mono">d_at</span> falls inside this window.
        Your selection is encoded in the URL, so the resulting view is shareable.
      </p>
    </div>
  );
}
