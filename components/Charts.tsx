"use client";

import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Trophy, Crown } from "lucide-react";
import { Card, SectionTitle, EmptyState, categoricalColor, lifecycleColor, ProjectBadge, UserChip } from "./ui";
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

// Re-bucket daily points into IST weeks (Monday-anchored) on the client.
function toWeekly(points: TimePoint[]): TimePoint[] {
  const DAY = 86400000;
  const IST = 5.5 * 3600000;
  const map = new Map<number, number>();
  for (const p of points) {
    const t = new Date(p.bucket).getTime();
    const dayStart = Math.floor((t + IST) / DAY) * DAY - IST;
    const dow = (new Date(t + IST).getUTCDay() + 6) % 7; // Monday = 0
    const monday = dayStart - dow * DAY;
    map.set(monday, (map.get(monday) ?? 0) + p.count);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({ bucket: new Date(t).toISOString(), count }));
}

/* ---------------- Trend ---------------- */
export function TrendChart({ points, granularity, loading }: { points: TimePoint[]; granularity: Granularity; loading?: boolean }) {
  const { get, set } = useFilters();
  const raw = (get("granularity") || granularity) as Granularity;
  const g: Granularity = raw === "weekly" ? "weekly" : "daily";
  const total = points.reduce((s, p) => s + p.count, 0);
  // `points` always arrive daily; weekly is re-bucketed here on the client so
  // toggling Daily/Weekly never refetches the dashboard.
  const bucketed = g === "weekly" ? toWeekly(points) : points;
  const data = bucketed.map((p) => ({ ...p, label: fmtBucket(p.bucket, g) }));

  return (
    <Card className="p-5 col-span-12 lg:col-span-6 animate-in">
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
    <Card className="p-5 col-span-12 lg:col-span-6 animate-in">
      <SectionTitle title="Deletions by Lifecycle Status" subtitle="Page state when deleted" info="Lifecycle state at deletion: No Products Tagged (deleted pre-generation with 0 products), Yet to be Generated (status NULL, had products), Generated (never published), Unpublished & Deleted (published then unpublished). Reflects the global time range and filters at the top." />
      <div className="h-[240px] relative">
        {loading || total === 0 ? (
          <EmptyState message={loading ? "Loading…" : "No data"} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="key" innerRadius={66} outerRadius={94} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={i} fill={lifecycleColor(d.key)} />)}
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
        {data.slice(0, 5).map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lifecycleColor(d.key) }} />
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
    <Card className={cn("p-5 col-span-12 lg:col-span-6 animate-in", colSpan)}>
      <SectionTitle title={title} subtitle={subtitle} info={kind === "user" ? "Top deleters. The real user shows when the system recorded the deletion (u_at = d_at); older/automated deletes where the actor wasn't captured are grouped as 'System'. Within the global filters." : "Top projects by deletion count, within the global time range and filters at the top. Scrolls if there are many."} />
      {loading ? (
        <EmptyState message="Loading…" />
      ) : data.length === 0 ? (
        <EmptyState message="No data" />
      ) : (
        <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1 -mr-1">
          {data.map((d, i) => (
            <div key={d.key}>
              {/* Label + count on one line — never overlaps the bar */}
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  {kind === "client" ? <ProjectBadge project={d.key} /> : <UserChip user={d.key} compact />}
                </span>
                <span className="shrink-0 font-semibold text-foreground tnum">{fmtNum(d.count)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: categoricalColor(i) }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


/* ---------------- Deletion Leaderboard (by user) ---------------- */
const MEDAL: Record<number, string> = { 1: "var(--chart-1)", 2: "#c4ccd6", 3: "#cd7f32" };

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL[rank];
  if (medal) {
    return (
      <span
        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold tnum"
        style={{ background: medal, color: "#181a20", boxShadow: `0 0 0 3px color-mix(in srgb, ${medal} 28%, transparent)` }}
      >
        {rank === 1 && <Crown size={11} className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ color: medal }} />}
        {rank}
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted-2 tnum">
      {rank}
    </span>
  );
}

export function UserLeaderboard({
  title, subtitle, data, loading, colSpan = "lg:col-span-6",
}: { title: string; subtitle: string; data: CountSlice[]; loading?: boolean; colSpan?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card className={cn("p-5 col-span-12 animate-in", colSpan)}>
      <SectionTitle
        title={title}
        subtitle={subtitle}
        info="Leaderboard of deleters by number of clusters deleted. The real user shows when the system recorded the deletion (u_at = d_at); older/automated deletes where the actor wasn't captured are grouped as 'System'. Within the global filters."
        right={<span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Trophy size={15} /></span>}
      />
      {loading ? (
        <EmptyState message="Loading…" />
      ) : data.length === 0 ? (
        <EmptyState message="No data" />
      ) : (
        <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1 -mr-1">
          {data.map((d, i) => {
            const rank = i + 1;
            const medal = MEDAL[rank];
            return (
              <div
                key={d.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors",
                  rank <= 3 ? "border-[var(--border)] bg-surface-2" : "border-transparent",
                )}
              >
                <RankBadge rank={rank} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      <UserChip user={d.key} compact />
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-foreground tnum">{fmtNum(d.count)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(d.count / max) * 100}%`, background: medal ?? "var(--accent)" }}
                    />
                  </div>
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] text-muted-2 tnum">{d.pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
