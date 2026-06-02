// Normalized deletion record used throughout the dashboard.
// The raw DB schema is discovered/mapped at query time (see lib/data/db.ts);
// everything downstream consumes this stable shape.
export interface DeletionRecord {
  cluster_id: string;
  cluster_name: string | null;
  created_at: string | null; // ISO
  updated_at: string | null; // ISO
  deleted_at: string; // ISO (always present — these are deletions)
  deleted_by: string | null;
  page_status: string | null;
  product_count: number | null;
  client: string | null;
  project: string | null;
  // Optional / best-effort fields for the audit drawer
  page_id?: string | null;
  last_modified_by?: string | null;
  deletion_notes?: string | null;
  deletion_reason_raw?: string | null;
  // Project enrichment (from projects join) — powers favicons & context
  project_domain?: string | null;
  topic?: string | null;
  page_type?: string | null;
  // Publish lifecycle (from processes history)
  last_published_at?: string | null;
  last_unpublished_at?: string | null;
  // Derived
  deletion_reason: string; // canonical reason (see derive.ts)
  workflow_stage: string; // canonical stage (see derive.ts)
}

export interface Filters {
  from: string; // ISO start of range
  to: string; // ISO end of range
  client?: string;
  project?: string;
  user?: string; // deleted_by
  reason?: string;
  stage?: string;
  status?: string; // page_status
  search?: string;
}

export type Granularity = "hourly" | "daily" | "weekly";

export interface KpiPayload {
  totalDeleted: number;
  deletionRate: number | null; // % deleted vs created in same window (null if not computable)
  createdInWindow: number;
  uniqueUsers: number;
  topReason: { reason: string; count: number; pct: number } | null;
  topClient: { client: string; count: number; pct: number } | null;
  prevTotalDeleted: number; // previous equivalent window, for delta
}

export interface TimePoint {
  bucket: string; // ISO
  count: number;
}

export interface CountSlice {
  key: string;
  count: number;
  pct: number;
}

export interface HeatCell {
  stage: string;
  reason: string;
  count: number;
}

export interface Insight {
  id: string;
  kind: "trend" | "stage" | "reason" | "user" | "client" | "info";
  severity: "info" | "warning" | "critical";
  title: string;
}

export interface DashboardPayload {
  source: "database" | "demo";
  kpis: KpiPayload;
  trend: { granularity: Granularity; points: TimePoint[] };
  byStage: CountSlice[];
  byReason: CountSlice[];
  byUser: CountSlice[];
  byClient: CountSlice[];
  heatmap: { stages: string[]; reasons: string[]; cells: HeatCell[] };
  recent: DeletionRecord[];
  insights: Insight[];
  filterOptions: FilterOptions;
  totalMatched: number;
  projectDomains: Record<string, string>; // project name -> root domain (for favicons)
}

export interface FilterOptions {
  clients: string[];
  projects: string[];
  users: string[];
  reasons: string[];
  stages: string[];
  statuses: string[];
}
