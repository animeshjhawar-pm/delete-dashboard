"use client";

import { useEffect, useState } from "react";
import { X, Boxes, Activity, Trash2, Copy, ArrowLeft, Layers, Clock, ChevronRight } from "lucide-react";
import { UserChip, StatusPill, ProjectBadge, PageTypeChip } from "./ui";
import { DeletionRecord, DeletionEvent } from "@/lib/types";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { faviconForProject } from "@/lib/projects";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-muted-2">{label}</span>
      <span className="text-right text-sm text-foreground min-w-0">{children}</span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-surface-2 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
        <span className="text-[var(--accent)]">{icon}</span>{title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[12px] text-muted">{children}</span>;
}

// Unified right-side drawer: shows a deletion EVENT (cards per cluster) or a
// single CLUSTER's full detail. From an event you can drill into a cluster and
// navigate back.
export function DetailDrawer({
  event, record, onSelectRecord, onBack, onClose,
}: {
  event: DeletionEvent | null;
  record: DeletionRecord | null;
  onSelectRecord: (r: DeletionRecord) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const open = !!(event || record);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (record && event ? onBack() : onClose());
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, record, event, onBack, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[480px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-drawer">
        {record ? (
          <ClusterDetail record={record} canBack={!!event} onBack={onBack} onClose={onClose} />
        ) : event ? (
          <EventDetail event={event} onSelectRecord={onSelectRecord} onClose={onClose} />
        ) : null}
      </aside>
    </div>
  );
}

/* ---------------- Event view: a card per deleted cluster ---------------- */
function EventDetail({
  event, onSelectRecord, onClose,
}: { event: DeletionEvent; onSelectRecord: (r: DeletionRecord) => void; onClose: () => void }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? event.clusters.filter((c) => c.workflow_stage === active) : event.clusters;
  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Layers size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{fmtNum(event.count)} clusters deleted</h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <Clock size={12} /> {fmtDateTime(event.deleted_at)}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground focus-ring">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[var(--border)] bg-surface-2 p-3">
            <div className="text-muted-2">Deleted by</div>
            <div className="mt-1 text-foreground"><UserChip user={event.deleted_by} /></div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-surface-2 p-3">
            <div className="text-muted-2">{event.projects.length === 1 ? "Project" : "Projects"}</div>
            <div className="mt-1 text-foreground">
              {event.projects.length === 1
                ? <ProjectBadge project={event.projects[0]} domain={event.project_domain} />
                : `${event.projects.length} projects`}
            </div>
          </div>
        </div>

        {/* Clickable lifecycle-status filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {event.statuses.map((s) => (
            <StatusPill
              key={s.key}
              status={s.key}
              count={s.count}
              onClick={() => setActive(active === s.key ? null : s.key)}
              dimmed={!!active && active !== s.key}
            />
          ))}
          {active && (
            <button onClick={() => setActive(null)} className="ml-1 text-[11px] text-muted hover:text-foreground">Clear</button>
          )}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          {active ? `${shown.length} of ${event.count}` : `Clusters (${event.count})`} — click a card to inspect
        </div>
        <div className="space-y-2">
          {shown.map((c) => (
            <button
              key={c.cluster_id}
              onClick={() => onSelectRecord(c)}
              className="card-hover flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-surface-2 p-3 text-left transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground" title={c.topic ?? c.cluster_name ?? ""}>{c.topic ?? c.cluster_name ?? c.cluster_id}</div>
                <div className="truncate font-mono text-[11px] text-muted-2">{c.cluster_id}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StatusPill status={c.workflow_stage} />
                  <PageTypeChip type={c.page_type} />
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-2" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- Single cluster detail ---------------- */
function ClusterDetail({
  record: r, canBack, onBack, onClose,
}: { record: DeletionRecord; canBack: boolean; onBack: () => void; onClose: () => void }) {
  const favicon = faviconForProject(r.project, 64, r.project_domain);
  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
        <div className="flex items-start gap-3 min-w-0">
          {canBack ? (
            <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted hover:text-foreground focus-ring" aria-label="Back to event">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Trash2 size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground" title={r.topic ?? r.cluster_name ?? ""}>
              {r.topic ?? r.cluster_name ?? r.cluster_id}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="truncate font-mono text-[11px] text-muted-2">{r.cluster_id}</span>
              <button onClick={() => navigator.clipboard?.writeText(r.cluster_id)} className="shrink-0 text-muted-2 hover:text-foreground"><Copy size={11} /></button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusPill status={r.workflow_stage} />
              <PageTypeChip type={r.page_type} />
            </div>
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground focus-ring">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Section icon={<Boxes size={13} />} title="Cluster Information">
          <Row label="Cluster ID"><span className="inline-flex items-center gap-1.5"><Mono>{r.cluster_id}</Mono><button onClick={() => navigator.clipboard?.writeText(r.cluster_id)} className="text-muted-2 hover:text-foreground"><Copy size={12} /></button></span></Row>
          <Row label="Primary Keyword">{r.cluster_name ?? "—"}</Row>
          {r.topic && <Row label="Topic">{r.topic}</Row>}
          <Row label="Page Type"><PageTypeChip type={r.page_type} /></Row>
          <Row label="Project">
            <span className="inline-flex items-center gap-2">
              {favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={favicon} alt="" width={16} height={16} className="rounded-[3px]" />
              )}
              {r.project ?? "—"}
            </span>
          </Row>
        </Section>

        <Section icon={<Activity size={13} />} title="Lifecycle">
          <Row label="Lifecycle Status"><StatusPill status={r.workflow_stage} /></Row>
          <Row label="Created At">{fmtDateTime(r.created_at)}</Row>
          <Row label="Updated At">{fmtDateTime(r.updated_at)}</Row>
          {r.last_published_at && <Row label="Last Published At"><span className="text-[var(--success)]">{fmtDateTime(r.last_published_at)}</span></Row>}
          {r.last_unpublished_at && <Row label="Last Unpublished At"><span className="text-[var(--warning)]">{fmtDateTime(r.last_unpublished_at)}</span></Row>}
          <Row label="Deleted At"><span className="font-medium text-[var(--critical)]">{fmtDateTime(r.deleted_at)}</span></Row>
        </Section>

        <Section icon={<Trash2 size={13} />} title="Deletion Metadata">
          <Row label="Deleted By"><UserChip user={r.deleted_by} /></Row>
          <Row label="Page Type"><PageTypeChip type={r.page_type} /></Row>
        </Section>
      </div>
    </>
  );
}
