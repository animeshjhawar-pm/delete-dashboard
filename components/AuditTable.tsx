"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, ChevronRight, ChevronLeft, Layers } from "lucide-react";
import { Card, SectionTitle, Button, ProjectBadge, UserChip, StatusPill, Spinner, EmptyState } from "./ui";
import { DeletionRecord, DeletionEvent } from "@/lib/types";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AuditTable({
  queryString, refreshKey, exportHref, onSelect, onSelectEvent, selectedId, selectedEventKey,
}: {
  queryString: string;
  refreshKey: number;
  exportHref: string;
  onSelect: (r: DeletionRecord) => void;
  onSelectEvent: (e: DeletionEvent) => void;
  selectedId?: string;
  selectedEventKey?: string;
}) {
  const [events, setEvents] = useState<DeletionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalClusters, setTotalClusters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => { setPage(1); }, [queryString, debounced, pageSize]);

  const url = useMemo(() => {
    const q = new URLSearchParams(queryString);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (debounced) q.set("search", debounced);
    return `/api/events?${q.toString()}`;
  }, [queryString, page, pageSize, debounced]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setEvents(j.events); setTotal(j.total); setTotalClusters(j.totalClusters); })
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
    if (ev.count === 1) onSelect(ev.clusters[0]);
    else onSelectEvent(ev);
  }

  const COL_COUNT = 6;

  return (
    <Card className="col-span-12 animate-in overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <SectionTitle
          title="Recent Deletions"
          subtitle={`${fmtNum(totalClusters)} clusters in ${fmtNum(total)} deletion events · newest first`}
          info="Deletions grouped by event — clusters removed at the same time (and same last editor) are one row, broken down by lifecycle status. Note: the deletion actor isn't recorded in the data, so 'Last Modified By' is the last person who edited the cluster, not necessarily who deleted it. Click an event to open it."
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--border)] bg-surface-2/50 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Deleted At</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Last Modified By</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Project</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Clusters</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left">Lifecycle Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr><td colSpan={COL_COUNT} className="py-16"><div className="flex items-center justify-center gap-2 text-muted"><Spinner /> Loading…</div></td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={COL_COUNT}><EmptyState message="No deletions match the current filters." /></td></tr>
            ) : (
              events.map((ev) => {
                const active = ev.key === selectedEventKey || (!!selectedId && ev.clusters.some((c) => c.cluster_id === selectedId));
                return (
                  <tr
                    key={ev.key}
                    onClick={() => onRowClick(ev)}
                    className={cn(
                      "cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-surface-2",
                      active && "bg-[var(--accent-soft)]",
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 tnum text-muted">{fmtDateTime(ev.deleted_at)}</td>
                    <td className="px-4 py-2.5"><UserChip user={ev.deleted_by} compact /></td>
                    <td className="px-4 py-2.5">
                      <div className="max-w-[180px]">
                        {ev.projects.length === 0 ? <span className="text-muted">—</span>
                          : ev.projects.length === 1 ? <ProjectBadge project={ev.projects[0]} domain={ev.project_domain} />
                          : <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted"><Layers size={13} /> {ev.projects.length} projects</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="font-semibold text-foreground tnum">{ev.count}</span>
                      <span className="text-muted-2"> {ev.count === 1 ? "cluster" : "clusters"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex max-w-[300px] flex-wrap gap-1.5">
                        {ev.statuses.map((s) => <StatusPill key={s.key} status={s.key} count={ev.count > 1 ? s.count : undefined} />)}
                      </div>
                    </td>
                    <td className="pr-3 text-muted-2"><ChevronRight size={15} /></td>
                  </tr>
                );
              })
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
