"use client";

import { Trash2, Percent, Users, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, Skeleton } from "./ui";
import { KpiPayload, CountSlice } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function Delta({ current, prev }: { current: number; prev: number }) {
  if (!prev) return <span className="text-[11px] text-muted-2">vs 0 prev</span>;
  const pct = ((current - prev) / prev) * 100;
  const up = pct >= 0;
  // For deletions, an increase is "bad" (red), a decrease is "good" (green).
  const tone = up ? "text-[var(--critical)]" : "text-[var(--success)]";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${tone}`}>
      <Icon size={12} /> {Math.abs(pct).toFixed(0)}%
      <span className="text-muted-2 font-normal ml-0.5">vs prev</span>
    </span>
  );
}

function Kpi({
  icon, label, value, sub, wrap,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; wrap?: boolean }) {
  return (
    <Card className="card-hover p-4 sm:p-5 flex flex-col gap-3 min-h-[118px] animate-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {/* All KPI icons share the same neutral chip treatment for consistency. */}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
          {icon}
        </span>
      </div>
      <div className="mt-auto">
        <div className={cn("font-semibold tracking-tight text-foreground tnum", wrap ? "text-lg leading-tight" : "text-2xl truncate")}>{value}</div>
        {sub && <div className="mt-1 text-xs text-muted truncate">{sub}</div>}
      </div>
    </Card>
  );
}

export function KpiCards({
  kpis, byStage, loading,
}: { kpis?: KpiPayload; byStage?: CountSlice[]; loading: boolean }) {
  if (!kpis || loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 min-h-[118px]"><Skeleton className="h-full w-full" /></Card>
        ))}
      </div>
    );
  }
  const topStatus = byStage?.[0];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        icon={<Trash2 size={16} />}
        label="Total Deleted Clusters"
        value={fmtNum(kpis.totalDeleted)}
        sub={<Delta current={kpis.totalDeleted} prev={kpis.prevTotalDeleted} />}
      />
      <Kpi
        icon={<Percent size={16} />}
        label="Deletion Rate"
        value={kpis.deletionRate == null ? "—" : fmtPct(kpis.deletionRate)}
        sub={`of ${fmtNum(kpis.createdInWindow)} created in period`}
      />
      <Kpi
        icon={<Users size={16} />}
        label="Unique Last Editors"
        value={fmtNum(kpis.uniqueUsers)}
        sub="distinct users (last edit)"
      />
      <Kpi
        icon={<FileText size={16} />}
        label="Top Lifecycle Status"
        wrap
        value={topStatus ? topStatus.key : "—"}
        sub={topStatus ? `${fmtNum(topStatus.count)} · ${fmtPct(topStatus.pct)} of deletions` : undefined}
      />
    </div>
  );
}
