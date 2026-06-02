import {
  DeletionRecord, Filters, Granularity, KpiPayload, TimePoint,
  CountSlice, HeatCell, Insight, FilterOptions,
} from "@/lib/types";

const DAY = 86400000;
const HOUR = 3600000;

export function applyFilters(records: DeletionRecord[], f: Partial<Filters>): DeletionRecord[] {
  const search = f.search?.trim().toLowerCase();
  return records.filter((r) => {
    if (f.client && r.client !== f.client) return false;
    if (f.project && r.project !== f.project) return false;
    if (f.user && r.deleted_by !== f.user) return false;
    if (f.reason && r.deletion_reason !== f.reason) return false;
    if (f.stage && r.workflow_stage !== f.stage) return false;
    if (f.status !== undefined && f.status !== "") {
      const s = r.page_status ?? "__null__";
      if (f.status === "__null__" ? r.page_status != null : s !== f.status) return false;
    }
    if (search) {
      const hay = [
        r.cluster_id, r.cluster_name, r.topic, r.client, r.project, r.deleted_by,
        r.deletion_reason, r.workflow_stage, r.page_type,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function buildFilterOptions(records: DeletionRecord[]): FilterOptions {
  const uniq = (vals: (string | null)[]) =>
    Array.from(new Set(vals.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
  return {
    clients: uniq(records.map((r) => r.client)),
    projects: uniq(records.map((r) => r.project)),
    users: uniq(records.map((r) => r.deleted_by)),
    reasons: uniq(records.map((r) => r.deletion_reason)),
    stages: uniq(records.map((r) => r.workflow_stage)),
    statuses: uniq(records.map((r) => r.page_status)),
  };
}

function slices(records: DeletionRecord[], key: (r: DeletionRecord) => string | null, limit?: number): CountSlice[] {
  const total = records.length || 1;
  const counts = new Map<string, number>();
  for (const r of records) {
    const k = key(r) ?? "Unknown";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let arr = Array.from(counts, ([key, count]) => ({
    key, count, pct: +((count / total) * 100).toFixed(1),
  })).sort((a, b) => b.count - a.count);
  if (limit) arr = arr.slice(0, limit);
  return arr;
}

export function byReason(r: DeletionRecord[]) { return slices(r, (x) => x.deletion_reason); }
export function byStage(r: DeletionRecord[]) { return slices(r, (x) => x.workflow_stage); }
export function byUser(r: DeletionRecord[], limit = 30) { return slices(r, (x) => x.deleted_by, limit); }
export function byClient(r: DeletionRecord[], limit = 30) { return slices(r, (x) => x.client, limit); }

export function autoGranularity(fromISO: string, toISO: string): Granularity {
  // Only Daily / Weekly are exposed in the UI.
  const span = new Date(toISO).getTime() - new Date(fromISO).getTime();
  if (span <= 21 * DAY) return "daily";
  return "weekly";
}

function bucketStart(t: number, g: Granularity): number {
  const d = new Date(t);
  if (g === "hourly") { d.setMinutes(0, 0, 0); return d.getTime(); }
  if (g === "daily") { d.setHours(0, 0, 0, 0); return d.getTime(); }
  // weekly -> Monday
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  return d.getTime() - day * DAY;
}

export function trend(records: DeletionRecord[], fromISO: string, toISO: string, g: Granularity): TimePoint[] {
  const from = bucketStart(new Date(fromISO).getTime(), g);
  const to = new Date(toISO).getTime();
  const step = g === "hourly" ? HOUR : g === "daily" ? DAY : 7 * DAY;
  const buckets = new Map<number, number>();
  for (let t = from; t <= to; t += step) buckets.set(t, 0);
  for (const r of records) {
    const b = bucketStart(new Date(r.deleted_at).getTime(), g);
    if (buckets.has(b)) buckets.set(b, (buckets.get(b) ?? 0) + 1);
    else buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({ bucket: new Date(t).toISOString(), count }));
}

export function heatmap(records: DeletionRecord[]) {
  const stagesSet = new Set<string>();
  const reasonsSet = new Set<string>();
  const cellMap = new Map<string, number>();
  for (const r of records) {
    stagesSet.add(r.workflow_stage);
    reasonsSet.add(r.deletion_reason);
    const k = `${r.workflow_stage}|||${r.deletion_reason}`;
    cellMap.set(k, (cellMap.get(k) ?? 0) + 1);
  }
  const stages = Array.from(stagesSet).sort();
  const reasons = Array.from(reasonsSet).sort();
  const cells: HeatCell[] = [];
  for (const stage of stages)
    for (const reason of reasons)
      cells.push({ stage, reason, count: cellMap.get(`${stage}|||${reason}`) ?? 0 });
  return { stages, reasons, cells };
}

export function computeKpis(
  filtered: DeletionRecord[],
  createdInWindow: number | null,
  prevCount: number,
): KpiPayload {
  const total = filtered.length;
  const users = new Set(filtered.map((r) => r.deleted_by).filter(Boolean));
  const reasons = byReason(filtered);
  const clients = byClient(filtered, 1);
  const deletionRate =
    createdInWindow && createdInWindow > 0
      ? +((total / createdInWindow) * 100).toFixed(1)
      : null;
  return {
    totalDeleted: total,
    deletionRate,
    createdInWindow: createdInWindow ?? 0,
    uniqueUsers: users.size,
    topReason: reasons[0]
      ? { reason: reasons[0].key, count: reasons[0].count, pct: reasons[0].pct }
      : null,
    topClient: clients[0]
      ? { client: clients[0].key, count: clients[0].count, pct: clients[0].pct }
      : null,
    prevTotalDeleted: prevCount,
  };
}

export function recent(records: DeletionRecord[], n = 8): DeletionRecord[] {
  return [...records]
    .sort((a, b) => +new Date(b.deleted_at) - +new Date(a.deleted_at))
    .slice(0, n);
}

export function insights(
  filtered: DeletionRecord[],
  prev: DeletionRecord[],
  rangeLabel: string,
): Insight[] {
  const out: Insight[] = [];
  const total = filtered.length;
  if (total === 0) return [{ id: "empty", kind: "info", severity: "info", title: "No deletions in the selected period." }];

  // Trend vs previous window
  if (prev.length > 0) {
    const delta = ((total - prev.length) / prev.length) * 100;
    const dir = delta >= 0 ? "increase" : "decrease";
    out.push({
      id: "trend",
      kind: "trend",
      severity: Math.abs(delta) >= 40 ? "warning" : "info",
      title: `${Math.abs(delta).toFixed(0)}% ${dir} in deletions vs the previous ${rangeLabel}.`,
    });
  }

  // Lifecycle: deleted before ever being generated
  const yetToGen = filtered.filter((r) => r.workflow_stage === "Yet to be Generated").length;
  if (yetToGen > 0) {
    const pct = (yetToGen / total) * 100;
    out.push({
      id: "stage",
      kind: "stage",
      severity: pct >= 60 ? "warning" : "info",
      title: `${pct.toFixed(0)}% were deleted before ever being generated.`,
    });
  }

  // Lifecycle: published then unpublished then deleted
  const unpubDeleted = filtered.filter((r) => r.workflow_stage === "Unpublished & Deleted").length;
  if (unpubDeleted > 0) {
    const pct = (unpubDeleted / total) * 100;
    out.push({
      id: "unpublished",
      kind: "stage",
      severity: pct >= 30 ? "warning" : "info",
      title: `${pct.toFixed(0)}% were published, then unpublished before deletion.`,
    });
  }

  // Reason concentration
  const reasons = byReason(filtered);
  if (reasons[0]) {
    out.push({
      id: "reason",
      kind: "reason",
      severity: reasons[0].pct >= 60 ? "warning" : "info",
      title: `"${reasons[0].key}" accounts for ${reasons[0].pct.toFixed(0)}% of all deletions.`,
    });
  }

  // Top user
  const users = byUser(filtered, 1);
  if (users[0] && users[0].key !== "Unknown") {
    out.push({
      id: "user",
      kind: "user",
      severity: "info",
      title: `${users[0].key} performed the most deletions (${users[0].count}) this period.`,
    });
  }

  // Top client
  const clients = byClient(filtered, 1);
  if (clients[0] && clients[0].key !== "Unknown") {
    out.push({
      id: "client",
      kind: "client",
      severity: clients[0].pct >= 40 ? "warning" : "info",
      title: `${clients[0].key} is the most impacted client (${clients[0].count} deletions).`,
    });
  }

  return out;
}
