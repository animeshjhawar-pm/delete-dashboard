import {
  DeletionRecord, Filters, Granularity, KpiPayload, TimePoint,
  CountSlice, Insight, FilterOptions,
} from "@/lib/types";
import { LIFECYCLE } from "./derive";

const DAY = 86400000;

export function applyFilters(records: DeletionRecord[], f: Partial<Filters>): DeletionRecord[] {
  const search = f.search?.trim().toLowerCase();
  return records.filter((r) => {
    if (f.client && r.client !== f.client) return false;
    if (f.project && r.project !== f.project) return false;
    if (f.user && r.deleted_by !== f.user) return false;
    if (f.stage && r.workflow_stage !== f.stage) return false;
    if (f.status !== undefined && f.status !== "") {
      const s = r.page_status ?? "__null__";
      if (f.status === "__null__" ? r.page_status != null : s !== f.status) return false;
    }
    if (search) {
      const hay = [
        r.cluster_id, r.cluster_name, r.topic, r.client, r.project, r.deleted_by,
        r.workflow_stage, r.page_type,
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

export function byStage(r: DeletionRecord[]) { return slices(r, (x) => x.workflow_stage); }
export function byUser(r: DeletionRecord[], limit = 30) { return slices(r, (x) => x.deleted_by, limit); }
export function byClient(r: DeletionRecord[], limit = 30) { return slices(r, (x) => x.client, limit); }

export function autoGranularity(fromISO: string, toISO: string): Granularity {
  // Only Daily / Weekly are exposed in the UI.
  const span = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return span <= 21 * DAY ? "daily" : "weekly";
}

function bucketStart(t: number, g: Granularity): number {
  const d = new Date(t);
  if (g === "daily") { d.setHours(0, 0, 0, 0); return d.getTime(); }
  // weekly -> Monday
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  return d.getTime() - day * DAY;
}

export function trend(records: DeletionRecord[], fromISO: string, toISO: string, g: Granularity): TimePoint[] {
  const from = bucketStart(new Date(fromISO).getTime(), g);
  const to = new Date(toISO).getTime();
  const step = g === "daily" ? DAY : 7 * DAY;
  const buckets = new Map<number, number>();
  for (let t = from; t <= to; t += step) buckets.set(t, 0);
  for (const r of records) {
    const b = bucketStart(new Date(r.deleted_at).getTime(), g);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({ bucket: new Date(t).toISOString(), count }));
}

export function computeKpis(
  filtered: DeletionRecord[],
  createdInWindow: number | null,
  prevCount: number,
): KpiPayload {
  const total = filtered.length;
  const users = new Set(filtered.map((r) => r.deleted_by).filter(Boolean));
  const deletionRate =
    createdInWindow && createdInWindow > 0
      ? +((total / createdInWindow) * 100).toFixed(1)
      : null;
  return {
    totalDeleted: total,
    deletionRate,
    createdInWindow: createdInWindow ?? 0,
    uniqueUsers: users.size,
    prevTotalDeleted: prevCount,
  };
}

export function insights(
  filtered: DeletionRecord[],
  prev: DeletionRecord[],
  rangeLabel: string,
): Insight[] {
  const out: Insight[] = [];
  const total = filtered.length;
  if (total === 0) return [{ id: "empty", kind: "info", severity: "info", title: "No deletions in the selected period." }];
  const pctOf = (n: number) => (n / total) * 100;

  // Trend vs previous window
  if (prev.length > 0) {
    const delta = ((total - prev.length) / prev.length) * 100;
    const dir = delta >= 0 ? "increase" : "decrease";
    out.push({
      id: "trend", kind: "trend",
      severity: Math.abs(delta) >= 40 ? "warning" : "info",
      title: `${Math.abs(delta).toFixed(0)}% ${dir} in deletions vs the previous ${rangeLabel}.`,
    });
  }

  // No products tagged
  const noProducts = filtered.filter((r) => r.workflow_stage === LIFECYCLE.NO_PRODUCTS).length;
  if (noProducts > 0) {
    const pct = pctOf(noProducts);
    out.push({
      id: "no-products", kind: "stage",
      severity: pct >= 60 ? "warning" : "info",
      title: `${pct.toFixed(0)}% were deleted with no products tagged.`,
    });
  }

  // Published then unpublished then deleted
  const unpubDeleted = filtered.filter((r) => r.workflow_stage === LIFECYCLE.UNPUB_DELETED).length;
  if (unpubDeleted > 0) {
    const pct = pctOf(unpubDeleted);
    out.push({
      id: "unpublished", kind: "stage",
      severity: pct >= 30 ? "warning" : "info",
      title: `${pct.toFixed(0)}% were published, then unpublished before deletion.`,
    });
  }

  // Top user
  const users = byUser(filtered, 1);
  if (users[0] && users[0].key !== "Unknown") {
    out.push({
      id: "user", kind: "user", severity: "info",
      title: `${users[0].key} performed the most deletions (${users[0].count}) this period.`,
    });
  }

  // Top client
  const clients = byClient(filtered, 1);
  if (clients[0] && clients[0].key !== "Unknown") {
    out.push({
      id: "client", kind: "client",
      severity: clients[0].pct >= 40 ? "warning" : "info",
      title: `${clients[0].key} is the most impacted client (${clients[0].count} deletions).`,
    });
  }

  return out;
}
