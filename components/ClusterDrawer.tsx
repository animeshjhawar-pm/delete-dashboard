"use client";

import { useEffect } from "react";
import { X, Boxes, Activity, FileText, Trash2, Copy } from "lucide-react";
import { Badge, ProjectBadge, UserChip } from "./ui";
import { DeletionRecord } from "@/lib/types";
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

export function ClusterDrawer({ record, onClose }: { record: DeletionRecord | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (record) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [record, onClose]);

  if (!record) return null;
  const r = record;
  const favicon = faviconForProject(r.project, 64, r.project_domain);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-drawer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Trash2 size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{r.cluster_name ?? r.cluster_id}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{r.deletion_reason}</Badge>
                <Badge tone="muted">{r.workflow_stage}</Badge>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground focus-ring">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Section icon={<Boxes size={13} />} title="Cluster Information">
            <Row label="Cluster ID"><span className="inline-flex items-center gap-1.5"><Mono>{r.cluster_id}</Mono><button onClick={() => navigator.clipboard?.writeText(r.cluster_id)} className="text-muted-2 hover:text-foreground"><Copy size={12} /></button></span></Row>
            <Row label="Primary Keyword">{r.cluster_name ?? "—"}</Row>
            {r.topic && <Row label="Topic">{r.topic}</Row>}
            {r.page_type && <Row label="Page Type">{r.page_type}</Row>}
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
            <Row label="Created At">{fmtDateTime(r.created_at)}</Row>
            <Row label="Updated At">{fmtDateTime(r.updated_at)}</Row>
            <Row label="Deleted At"><span className="font-medium text-[var(--critical)]">{fmtDateTime(r.deleted_at)}</span></Row>
          </Section>

          <Section icon={<FileText size={13} />} title="Workflow Snapshot Before Deletion">
            <Row label="Page Status">{r.page_status ?? <span className="italic text-muted-2">null</span>}</Row>
            <Row label="Product Count"><span className="tnum">{r.product_count == null ? "—" : fmtNum(r.product_count)}</span></Row>
            <Row label="Associated Page ID">{r.page_id ? <Mono>{r.page_id}</Mono> : "—"}</Row>
            <Row label="Last Modified By"><UserChip user={r.last_modified_by ?? null} /></Row>
          </Section>

          <Section icon={<Trash2 size={13} />} title="Deletion Metadata">
            <Row label="Deleted By"><UserChip user={r.deleted_by} /></Row>
            <Row label="Deletion Reason">{r.deletion_reason}</Row>
            <Row label="Deletion Notes"><span className="text-muted">{r.deletion_notes ?? "—"}</span></Row>
          </Section>
        </div>
      </aside>
    </div>
  );
}
