"use client";

import { Download, X, SlidersHorizontal } from "lucide-react";
import { Button, Badge, ProjectBadge, UserChip } from "./ui";
import { SingleSelect, MultiSelect } from "./Dropdown";
import { useFilters } from "@/lib/client/useFilters";
import { FilterOptions } from "@/lib/types";
import { RANGE_PRESETS } from "@/lib/range";

const RANGE_OPTIONS = [
  ...Object.entries(RANGE_PRESETS).map(([value, v]) => ({ value, label: v.label })),
  { value: "custom", label: "Custom Range" },
];

const pad = (n: number) => String(n).padStart(2, "0");
// ISO -> value for <input type="datetime-local"> (local, minute precision)
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Filters({
  options, exportHref, totalMatched,
}: { options?: FilterOptions; exportHref: string; totalMatched?: number }) {
  const { params, set, getMulti, toggleMulti, setMulti, activeCount, reset } = useFilters();
  const range = params.range || "7d";

  const projectOpts = (options?.projects ?? []).map((v) => ({ value: v, label: v, render: <ProjectBadge project={v} /> }));
  const userOpts = (options?.users ?? []).map((v) => ({ value: v, label: v, render: <UserChip user={v} /> }));
  const stageOpts = (options?.stages ?? []).map((v) => ({ value: v, label: v }));

  const projSel = getMulti("project"), userSel = getMulti("user"), stageSel = getMulti("stage");
  const projLabel = projSel.length ? "Projects" : "All Projects";
  const userLabel = userSel.length ? "Deleters" : "All Deleters";
  const stageLabel = stageSel.length ? "Lifecycle" : "All Lifecycle Statuses";

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Global Filters</span>
        </div>

        {/* Time range — single select */}
        <SingleSelect value={range} onChange={(v) => set("range", v)} options={RANGE_OPTIONS} width={170} className="w-[150px]" />

        {range === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              value={toLocalInput(params.from) || toLocalInput(new Date(Date.now() - 7 * 864e5).toISOString())}
              onChange={(e) => set("from", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="h-9 rounded-lg border border-[var(--border)] bg-surface px-2.5 text-sm text-foreground focus-ring"
            />
            <span className="text-muted-2 text-xs">to</span>
            <input
              type="datetime-local"
              value={toLocalInput(params.to) || toLocalInput(new Date().toISOString())}
              onChange={(e) => set("to", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="h-9 rounded-lg border border-[var(--border)] bg-surface px-2.5 text-sm text-foreground focus-ring"
            />
          </div>
        )}

        <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />

        {/* Multi-selects */}
        <MultiSelect label={projLabel} selected={projSel} onToggle={(v) => toggleMulti("project", v)} onClear={() => setMulti("project", [])} options={projectOpts} searchable width={260} />
        <MultiSelect label={userLabel} selected={userSel} onToggle={(v) => toggleMulti("user", v)} onClear={() => setMulti("user", [])} options={userOpts} searchable width={250} />
        <MultiSelect label={stageLabel} selected={stageSel} onToggle={(v) => toggleMulti("stage", v)} onClear={() => setMulti("stage", [])} options={stageOpts} width={230} />

        <div className="ml-auto flex items-center gap-2">
          {typeof totalMatched === "number" && (
            <Badge tone="muted" className="tnum">{totalMatched.toLocaleString()} matched</Badge>
          )}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
              <X size={13} /> Clear ({activeCount})
            </Button>
          )}
          <a href={exportHref} download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
