"use client";

import { Clock } from "lucide-react";
import { Card, SectionTitle, Badge, UserChip, EmptyState, Skeleton } from "./ui";
import { DeletionRecord } from "@/lib/types";
import { fmtRelative } from "@/lib/format";

export function RecentFeed({
  records, loading, onSelect,
}: { records?: DeletionRecord[]; loading?: boolean; onSelect: (r: DeletionRecord) => void }) {
  return (
    <Card className="p-5 col-span-12 lg:col-span-4 animate-in">
      <SectionTitle
        title="Recent Deletions"
        subtitle="Latest activity"
        right={<span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"><Clock size={15} /></span>}
      />
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !records || records.length === 0 ? (
        <EmptyState message="No recent deletions" />
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar -mr-2 pr-2">
          {records.map((r) => (
            <button
              key={r.cluster_id}
              onClick={() => onSelect(r)}
              className="card-hover w-full rounded-xl border border-[var(--border)] bg-surface-2 p-3 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{r.cluster_name ?? r.cluster_id}</span>
                <span className="shrink-0 text-[11px] text-muted-2 tnum">{fmtRelative(r.deleted_at)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="muted">{r.workflow_stage}</Badge>
                <Badge tone="accent">{r.deletion_reason}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted"><UserChip user={r.deleted_by} /></div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
