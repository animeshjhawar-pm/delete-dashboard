"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Card, SectionTitle, Badge, Button, ProjectBadge, UserChip, Spinner, EmptyState } from "./ui";
import { DeletionRecord } from "@/lib/types";
import { fmtDateTime, fmtDate, fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Col {
  key: keyof DeletionRecord;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (r: DeletionRecord) => React.ReactNode;
}

const COLS: Col[] = [
  { key: "deleted_at", label: "Deleted At", sortable: true, render: (r) => <span className="tnum text-muted">{fmtDateTime(r.deleted_at)}</span> },
  { key: "cluster_name", label: "Cluster", sortable: true, render: (r) => (
    <div className="min-w-0"><div className="truncate font-medium text-foreground">{r.cluster_name ?? "—"}</div><div className="truncate text-[11px] text-muted-2">{r.cluster_id}</div></div>
  ) },
  { key: "client", label: "Client", sortable: true, render: (r) => <span className="text-muted">{r.client ?? "—"}</span> },
  { key: "project", label: "Project", sortable: true, render: (r) => <ProjectBadge project={r.project} domain={r.project_domain} /> },
  { key: "deleted_by", label: "Deleted By", sortable: true, render: (r) => <UserChip user={r.deleted_by} /> },
  { key: "workflow_stage", label: "Lifecycle", sortable: true, render: (r) => <Badge tone="muted">{r.workflow_stage}</Badge> },
  { key: "page_status", label: "Status", sortable: true, render: (r) => <span className="text-muted">{r.page_status ?? <span className="text-muted-2 italic">null</span>}</span> },
  { key: "deletion_reason", label: "Reason", sortable: true, render: (r) => <Badge tone="accent">{r.deletion_reason}</Badge> },
  { key: "product_count", label: "Products", sortable: true, className: "text-right", render: (r) => <span className="tnum text-muted">{r.product_count ?? "—"}</span> },
  { key: "created_at", label: "Created", sortable: true, render: (r) => <span className="tnum text-muted-2">{fmtDate(r.created_at)}</span> },
];

export function AuditTable({
  queryString, refreshKey, exportHref, onSelect, selectedId,
}: {
  queryString: string;
  refreshKey: number;
  exportHref: string;
  onSelect: (r: DeletionRecord) => void;
  selectedId?: string;
}) {
  const [rows, setRows] = useState<DeletionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<keyof DeletionRecord>("deleted_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 when filters/search change.
  useEffect(() => { setPage(1); }, [queryString, debounced, pageSize, sort, dir]);

  const url = useMemo(() => {
    const q = new URLSearchParams(queryString);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    q.set("sort", String(sort));
    q.set("dir", dir);
    if (debounced) q.set("search", debounced);
    return `/api/audit?${q.toString()}`;
  }, [queryString, page, pageSize, sort, dir, debounced]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setRows(j.rows); setTotal(j.total); })
      .catch((e) => { if (e.name !== "AbortError") console.error(e); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [url, refreshKey]);

  function toggleSort(key: keyof DeletionRecord) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(key); setDir("desc"); }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const tableExportHref = useMemo(() => {
    const q = new URLSearchParams(queryString);
    if (debounced) q.set("search", debounced);
    return `/api/export?${q.toString()}`;
  }, [queryString, debounced]);

  return (
    <Card className="col-span-12 animate-in overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <SectionTitle title="Recent Deletions · Audit Log" subtitle={`${fmtNum(total)} deleted clusters · newest first · click a row to investigate`} />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clusters, projects, users, keywords…"
              className="h-10 w-[260px] rounded-lg border border-[var(--border)] bg-surface pl-9 pr-3 text-sm text-foreground focus-ring sm:w-[340px]"
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
            <tr className="border-y border-[var(--border)] bg-surface-2/50">
              {COLS.map((c) => (
                <th key={String(c.key)} className={cn("whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2", c.className)}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      {c.label}
                      {sort === c.key ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={11} className="opacity-40" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan={COLS.length} className="py-16"><div className="flex items-center justify-center gap-2 text-muted"><Spinner /> Loading…</div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLS.length}><EmptyState message="No deletions match the current filters." /></td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.cluster_id}
                  onClick={() => onSelect(r)}
                  className={cn(
                    "cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-surface-2",
                    selectedId === r.cluster_id && "bg-[var(--accent-soft)]",
                  )}
                >
                  {COLS.map((c) => (
                    <td key={String(c.key)} className={cn("max-w-[220px] px-4 py-2.5", c.className)}>
                      {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="tnum">{start}–{end} of {fmtNum(total)}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-7 rounded-md border border-[var(--border)] bg-surface px-1.5 text-xs focus-ring"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
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
