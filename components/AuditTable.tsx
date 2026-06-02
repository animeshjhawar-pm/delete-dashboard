"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Download, ChevronRight, ChevronDown, ChevronLeft, Layers,
} from "lucide-react";
import { Card, SectionTitle, Button, ProjectBadge, UserChip, StatusPill, Spinner, EmptyState } from "./ui";
import { DeletionRecord, DeletionEvent } from "@/lib/types";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AuditTable({
  queryString, refreshKey, exportHref, onSelect, selectedId, stages = [],
}: {
  queryString: string;
  refreshKey: number;
  exportHref: string;
  onSelect: (r: DeletionRecord) => void;
  selectedId?: string;
  stages?: string[];
}) {
  const [events, setEvents] = useState<DeletionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalClusters, setTotalClusters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [localStages, setLocalStages] = useState<string[]>([]); // local-to-this-tab lifecycle filter

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => { setPage(1); }, [queryString, debounced, pageSize, localStages]);

  const url = useMemo(() => {
    const q = new URLSearchParams(queryString);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (debounced) q.set("search", debounced);
    if (localStages.length) q.set("lifecycle", localStages.join(","));
    return `/api/events?${q.toString()}`;
  }, [queryString, page, pageSize, debounced, localStages]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setEvents(j.events); setTotal(j.total); setTotalClusters(j.totalClusters); setExpanded(new Set()); })
      .catch((e) => { if (e.name !== "AbortError") console.error(e); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [url, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const tableExportHref = useMemo(() => {
    const q = new URLSearchParams(queryString);
    if (debounced) q.set("search", debounced);
    return `/api/export?${q.toString()}`;
  }, [queryString, debounced]);

  function onRowClick(ev: DeletionEvent) {
    if (ev.count === 1) { onSelect(ev.clusters[0]); return; }
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(ev.key)) n.delete(ev.key); else n.add(ev.key);
      return n;
    });
  }

  function toggleLocalStage(s: string) {
    setLocalStages((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  const COL_COUNT = 6;

  return (
    <Card className="col-span-12 animate-in overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <SectionTitle
          title="Recent Deletions"
          subtitle={`${fmtNum(totalClusters)} clusters in ${fmtNum(total)} deletion events · newest first`}
          info="Deletions grouped by event — clusters removed together by the same user are one row, subgrouped by lifecycle status. Inherits the global filters; the pills and search below narrow within them. Click an event to expand its clusters as chips, then a chip to see that cluster's full timeline."
        />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clusters, projects, users, keywords…"
              className="h-10 w-[280px] rounded-lg border border-[var(--border)] bg-surface pl-9 pr-3 text-sm text-foreground focus-ring sm:w-[340px]"
            />
          </div>
          <a href={tableExportHref || exportHref} download>
            <Button variant="outline" size="sm" className="gap-1.5"><Download size={14} /> CSV</Button>
          </a>
        </div>
      </div>

      {/* Local lifecycle-status filter (this tab only) */}
      {stages.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-2">Lifecycle</span>
          {stages.map((s) => (
            <StatusPill key={s} status={s} onClick={() => toggleLocalStage(s)} dimmed={localStages.length > 0 && !localStages.includes(s)} />
          ))}
          {localStages.length > 0 && (
            <button onClick={() => setLocalStages([])} className="ml-1 text-[11px] text-muted hover:text-foreground">Reset</button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--border)] bg-surface-2/50 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <th className="w-8" />
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Deleted At</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Deleted By</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Project</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Clusters</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Lifecycle Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr><td colSpan={COL_COUNT} className="py-16"><div className="flex items-center justify-center gap-2 text-muted"><Spinner /> Loading…</div></td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={COL_COUNT}><EmptyState message="No deletions match the current filters." /></td></tr>
            ) : (
              events.map((ev) => (
                <Group key={ev.key} ev={ev} isOpen={expanded.has(ev.key)} onRowClick={onRowClick} onSelect={onSelect} selectedId={selectedId} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="tnum">{start}–{end} of {fmtNum(total)} events</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-7 rounded-md border border-[var(--border)] bg-surface px-1.5 text-xs focus-ring"
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          {loading && <Spinner className="text-muted-2" />}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></Button>
          <span className="px-2 tnum">Page {page} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></Button>
        </div>
      </div>
    </Card>
  );
}

function Group({
  ev, isOpen, onRowClick, onSelect, selectedId,
}: {
  ev: DeletionEvent;
  isOpen: boolean;
  onRowClick: (ev: DeletionEvent) => void;
  onSelect: (r: DeletionRecord) => void;
  selectedId?: string;
}) {
  const multi = ev.count > 1;
  return (
    <>
      <tr onClick={() => onRowClick(ev)} className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-surface-2">
        <td className="pl-3 text-muted-2">
          {multi ? (isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : <span className="inline-block w-[15px]" />}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 tnum text-muted">{fmtDateTime(ev.deleted_at)}</td>
        <td className="px-4 py-2.5"><UserChip user={ev.deleted_by} /></td>
        <td className="max-w-[220px] px-4 py-2.5">
          {ev.projects.length === 0 ? <span className="text-muted">—</span>
            : ev.projects.length === 1 ? <ProjectBadge project={ev.projects[0]} domain={ev.project_domain} />
            : <span className="inline-flex items-center gap-1.5 text-muted"><Layers size={13} /> {ev.projects.length} projects</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5">
          <span className="font-semibold text-foreground tnum">{ev.count}</span>
          <span className="text-muted-2"> {ev.count === 1 ? "cluster" : "clusters"}</span>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {ev.statuses.map((s) => <StatusPill key={s.key} status={s.key} count={multi ? s.count : undefined} />)}
          </div>
        </td>
      </tr>

      {multi && isOpen && (
        <tr className="border-b border-[var(--border)] bg-background/40">
          <td />
          <td colSpan={5} className="px-4 py-3">
            <div className="space-y-3">
              {ev.statuses.map((s) => (
                <div key={s.key}>
                  <div className="mb-1.5"><StatusPill status={s.key} count={s.count} /></div>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.clusters.filter((c) => c.workflow_stage === s.key).map((c) => (
                      <ClusterChip key={c.cluster_id} cluster={c} selected={selectedId === c.cluster_id} onClick={() => onSelect(c)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ClusterChip({
  cluster, onClick, selected,
}: { cluster: DeletionRecord; onClick: () => void; selected?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={cluster.cluster_id}
      className={cn(
        "inline-flex max-w-[260px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors focus-ring",
        selected
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-foreground"
          : "border-[var(--border)] bg-surface text-foreground hover:border-[var(--border-strong)] hover:bg-surface-2",
      )}
    >
      <span className="truncate">{cluster.cluster_name ?? cluster.cluster_id}</span>
      {cluster.page_type && <span className="shrink-0 text-muted-2">· {cluster.page_type}</span>}
    </button>
  );
}
