"use client";

import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, SectionTitle, EmptyState, CHART_COLORS, categoricalColor, ProjectBadge, UserChip } from "./ui";
import { CountSlice, TimePoint, Granularity } from "@/lib/types";
import { fmtBucket, fmtNum } from "@/lib/format";
import { useFilters } from "@/lib/client/useFilters";
import { cn } from "@/lib/cn";

function TooltipBox({ title, rows }: { title?: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      {title && <div className="mb-1 font-medium text-foreground">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-muted">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="ml-auto font-semibold text-foreground tnum">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Trend ---------------- */
export function TrendChart({ points, granularity, loading }: { points: TimePoint[]; granularity: Granularity; loading?: boolean }) {
  const { get, set } = useFilters();
  const raw = (get("granularity") || granularity) as Granularity;
  const g: Granularity = raw === "weekly" ? "weekly" : "daily";
  const total = points.reduce((s, p) => s + p.count, 0);
  const data = points.map((p) => ({ ...p, label: fmtBucket(p.bucket, g) }));

  return (
    <Card className="p-5 col-span-12 animate-in">
      <SectionTitle
        title="Deletion Trend Over Time"
        subtitle={`${fmtNum(total)} deletions · spot spikes and unusual activity`}
        info="Number of clusters deleted over time, bucketed Daily or Weekly. Uses the global time range and filters selected at the top."
        right={
          <div className="flex rounded-lg border border-[var(--border)] p-0.5 text-xs">
            {(["daily", "weekly"] as Granularity[]).map((opt) => (
              <button
                key={opt}
                onClick={() => set("granularity", opt)}
                className={cn(
                  "rounded-md px-2.5 py-1 capitalize transition-colors",
                  g === opt ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-muted hover:text-foreground",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        }
      />
      <div className="h-[260px]">
        {loading || points.length === 0 ? (
          <EmptyState message={loading ? "Loading…" : "No deletions in range"} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={42} />
              <Tooltip
                cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox title={String(payload[0].payload.label)} rows={[{ label: "Deletions", value: fmtNum(payload[0].value as number), color: "var(--accent)" }]} />
                  ) : null
                }
              />
              <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fill="url(#trendFill)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Stage Donut ---------------- */
export function StageDonut({ data, loading }: { data: CountSlice[]; loading?: boolean }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="p-5 col-span-12 lg:col-span-4 animate-in">
      <SectionTitle title="Deletions by Lifecycle Status" subtitle="Page state when deleted" info="Lifecycle state at deletion: No Products Tagged (deleted pre-generation with 0 products), Yet to be Generated (status NULL, had products), Generated (never published), Unpublished & Deleted (published then unpublished). Reflects the global time range and filters at the top." />
      <div className="h-[240px] relative">
        {loading || total === 0 ? (
          <EmptyState message={loading ? "Loading…" : "No data"} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="key" innerRadius={66} outerRadius={94} paddingAngle={2} stroke="none">
                  {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox rows={[{ label: String(payload[0].name), value: `${fmtNum(payload[0].value as number)} (${(payload[0].payload as CountSlice).pct}%)`, color: payload[0].payload.fill }]} />
                  ) : null
                } />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-semibold text-foreground tnum">{fmtNum(total)}</div>
              <div className="text-[11px] text-muted-2">deletions</div>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate text-muted">{d.key}</span>
            <span className="ml-auto font-medium text-foreground tnum">{fmtNum(d.count)}</span>
            <span className="w-10 text-right text-muted-2 tnum">{d.pct}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Horizontal bars (User / Client) ---------------- */
export function HBars({
  title, subtitle, data, kind, loading, colSpan = "lg:col-span-6",
}: { title: string; subtitle: string; data: CountSlice[]; kind: "user" | "client"; loading?: boolean; colSpan?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card className={cn("p-5 col-span-12 animate-in", colSpan)}>
      <SectionTitle title={title} subtitle={subtitle} info={`Top ${kind === "user" ? "users who performed deletions" : "projects by deletion count"}, within the global time range and filters at the top. Scrolls if there are many.`} />
      {loading ? (
        <EmptyState message="Loading…" />
      ) : data.length === 0 ? (
        <EmptyState message="No data" />
      ) : (
        <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1 -mr-1">
          {data.map((d, i) => (
            <div key={d.key} className="flex items-center gap-3">
              <div className="w-[38%] min-w-0 text-xs">
                {kind === "client" ? <ProjectBadge project={d.key} /> : <UserChip user={d.key} />}
              </div>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${(d.count / max) * 100}%`, background: categoricalColor(i), opacity: 0.9 }} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-foreground tnum">{fmtNum(d.count)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

