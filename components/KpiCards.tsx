"use client";

import { Trash2, Percent, Users, Tag, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, Skeleton } from "./ui";
import { KpiPayload } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";

function Delta({ current, prev }: { current: number; prev: number }) {
  if (!prev) return <span className="text-[11px] text-muted-2">vs 0 prev</span>;
  const pct = ((current - prev) / prev) * 100;
  const up = pct >= 0;
  // For deletions, an increase is "bad" (warning), decrease is "good".
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
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <Card className="card-hover p-4 sm:p-5 flex flex-col gap-3 min-h-[118px] animate-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: accent ?? "var(--surface-2)", color: accent ? "var(--accent-foreground)" : "var(--muted)" }}>
          {icon}
        </span>
      </div>
      <div className="mt-auto">
        <div className="text-2xl font-semibold tracking-tight text-foreground tnum truncate">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted truncate">{sub}</div>}
      </div>
    </Card>
  );
}

export function KpiCards({ kpis, loading }: { kpis?: KpiPayload; loading: boolean }) {
  if (!kpis || loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-5 min-h-[118px]"><Skeleton className="h-full w-full" /></Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi
        icon={<Trash2 size={16} />} accent="var(--accent)"
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
        label="Unique Deleters"
        value={fmtNum(kpis.uniqueUsers)}
        sub="distinct users"
      />
      <Kpi
        icon={<Tag size={16} />}
        label="Top Deletion Reason"
        value={kpis.topReason ? <span className="text-base font-semibold">{kpis.topReason.reason}</span> : "—"}
        sub={kpis.topReason ? `${fmtPct(kpis.topReason.pct)} of deletions` : undefined}
      />
      <Kpi
        icon={<Building2 size={16} />}
        label="Most Impacted Client"
        value={kpis.topClient ? <span className="text-base font-semibold">{kpis.topClient.client}</span> : "—"}
        sub={kpis.topClient ? `${fmtNum(kpis.topClient.count)} deletions` : undefined}
      />
    </div>
  );
}
