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
  // Project enrichment (from projects join) — powers favicons & context
  project_domain?: string | null;
  topic?: string | null;
  page_type?: string | null;
  // Publish lifecycle (from processes history)
  last_published_at?: string | null;
  last_unpublished_at?: string | null;
  no_products_tagged?: boolean; // PAGE_GEN process flagged "No products tagged"
  // Derived single lifecycle status (see derive.ts)
  workflow_stage: string;
}

export interface Filters {
  from: string; // ISO start of range
  to: string; // ISO end of range
  project?: string[]; // multi-select
  user?: string[]; // multi-select (deleted_by)
  stage?: string[]; // multi-select (lifecycle status)
  search?: string;
}

// A deletion "event" — one or more clusters deleted together (same timestamp
// by the same user), with a per-lifecycle-status breakdown.
export interface DeletionEvent {
  key: string;
  deleted_at: string;
  deleted_by: string | null;
  projects: string[];
  project_domain: string | null; // when a single project, its domain (favicon)
  count: number;
  statuses: { key: string; count: number }[];
  clusters: DeletionRecord[];
}

export type Granularity = "daily" | "weekly";

export interface KpiPayload {
  totalDeleted: number;
  deletionRate: number | null; // % deleted vs created in same window (null if not computable)
  createdInWindow: number;
  uniqueUsers: number;
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

export interface Insight {
  id: string;
  kind: "trend" | "stage" | "user" | "client" | "info";
  severity: "info" | "warning" | "critical";
  title: string;
}

export interface DashboardPayload {
  source: "database" | "demo";
  kpis: KpiPayload;
  trend: { granularity: Granularity; points: TimePoint[] };
  byStage: CountSlice[];
  byUser: CountSlice[];
  byClient: CountSlice[];
  insights: Insight[];
  filterOptions: FilterOptions;
  totalMatched: number;
  projectDomains: Record<string, string>; // project name -> root domain (for favicons)
}

export interface FilterOptions {
  projects: string[];
  users: string[];
  stages: string[];
}
