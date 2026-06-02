"use client";

import { Clock } from "lucide-react";
import { Card, SectionTitle, Badge, UserChip, ProjectBadge, EmptyState, Skeleton } from "./ui";
import { DeletionRecord } from "@/lib/types";
import { fmtRelative } from "@/lib/format";

export function RecentFeed({
  records, loading, onSelect,
}: { records?: DeletionRecord[]; loading?: boolean; onSelect: (r: DeletionRecord) => void }) {
  return (
    <Card className="p-5 col-span-12 animate-in">
      <SectionTitle
        title="Recent Deletions"
        subtitle="Latest deleted clusters, newest first"
        info="The most recently deleted clusters within the global time range and filters. Click any card to open the full audit detail."
        right={<span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"><Clock size={15} /></span>}
      />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px] w-full" />)}
        </div>
      ) : !records || records.length === 0 ? (
        <EmptyState message="No recent deletions" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {records.map((r) => (
            <button
              key={r.cluster_id}
              onClick={() => onSelect(r)}
              className="card-hover flex h-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-surface-2 p-3.5 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-sm font-medium text-foreground">{r.cluster_name ?? r.cluster_id}</span>
                <span className="shrink-0 text-[11px] text-muted-2 tnum">{fmtRelative(r.deleted_at)}</span>
              </div>
              <div className="text-xs text-muted"><ProjectBadge project={r.project} domain={r.project_domain} /></div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                <Badge tone="muted">{r.workflow_stage}</Badge>
                <Badge tone="accent">{r.deletion_reason}</Badge>
              </div>
              <div className="text-xs text-muted"><UserChip user={r.deleted_by} /></div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
