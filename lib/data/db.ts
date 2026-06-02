import { Pool, type PoolConfig } from "pg";
import { DeletionRecord } from "@/lib/types";
import { deriveReason, deriveLifecycle } from "./derive";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
let pool: Pool | null = null;

function sslConfig(url: string): PoolConfig["ssl"] {
  const mode = (process.env.DATABASE_SSL || "").toLowerCase();
  if (mode === "disable" || mode === "false") return undefined;
  if (mode === "require" || mode === "true") return { rejectUnauthorized: false };
  if (/railway\.internal|localhost|127\.0\.0\.1|::1/.test(url)) return undefined;
  // Managed Postgres (RDS, etc.) needs SSL; we don't pin the CA here.
  return { rejectUnauthorized: false };
}

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: sslConfig(url),
      // Sized for concurrent dashboard users; the TTL/single-flight cache keeps
      // actual simultaneous queries well below this in practice.
      max: Number(process.env.PG_POOL_MAX || 10),
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 25000,
      keepAlive: true,
    });
    pool.on("error", (e) => console.error("[pg] idle client error", e.message));
    warmUp(pool);
  }
  return pool;
}

// Establish a few connections up-front so the first user request doesn't pay
// the TLS-handshake cost (a single dashboard load fans out to ~4 parallel
// queries). Fire-and-forget; failures are non-fatal.
function warmUp(p: Pool) {
  const n = Math.min(4, Number(process.env.PG_POOL_MAX || 10));
  for (let i = 0; i < n; i++) {
    p.query("SELECT 1").catch(() => {});
  }
  // Prime the table-existence probe too.
  clustersTableExists().catch(() => {});
}

// ---------------------------------------------------------------------------
// Schema configuration.
//
// Tuned for the gw_stormbreaker schema (public.clusters), where a "cluster" is
// a page and a soft-delete sets `d_at`. Every identifier is overridable via env
// so the same build works against a renamed/forked schema without code changes.
// ---------------------------------------------------------------------------
const T = {
  schema: process.env.DB_SCHEMA || "public",
  clusters: process.env.TBL_CLUSTERS || "clusters",
  projects: process.env.TBL_PROJECTS || "projects",
  resourceMap: process.env.TBL_RESOURCE_MAP || "cluster_resource_mapping",
  processes: process.env.TBL_PROCESSES || "processes",
};

// Process-history vocabulary (overridable). Used to detect publish/unpublish.
const PROC = {
  table: process.env.COL_PROC_TABLE || "table_name",
  rowId: process.env.COL_PROC_ROW_ID || "row_id",
  type: process.env.COL_PROC_TYPE || "process_type",
  status: process.env.COL_PROC_STATUS || "process_status",
  completedAt: process.env.COL_PROC_COMPLETED || "completed_at",
  publishType: process.env.PROC_PUBLISH_TYPE || "PAGE_PUBLISH",
  unpublishType: process.env.PROC_UNPUBLISH_TYPE || "PAGE_UNPUBLISH",
  doneStatus: process.env.PROC_DONE_STATUS || "COMPLETED",
};
const C = {
  id: process.env.COL_ID || "id",
  projectId: process.env.COL_PROJECT_ID || "p_id",
  name: process.env.COL_NAME || "primary_kw",
  topic: process.env.COL_TOPIC || "topic",
  pageType: process.env.COL_PAGE_TYPE || "page_type",
  createdAt: process.env.COL_CREATED_AT || "c_at",
  updatedAt: process.env.COL_UPDATED_AT || "u_at",
  deletedAt: process.env.COL_DELETED_AT || "d_at",
  updatedBy: process.env.COL_UPDATED_BY || "u_by",
  pageStatus: process.env.COL_PAGE_STATUS || "page_status",
  contentId: process.env.COL_CONTENT_ID || "content_id",
  // projects
  projName: process.env.COL_PROJECT_NAME || "name",
  projDomain: process.env.COL_PROJECT_DOMAIN || "root_domain",
  // resource mapping
  rmClusterId: process.env.COL_RM_CLUSTER_ID || "cl_id",
  rmDeletedAt: process.env.COL_RM_DELETED_AT || "d_at",
};

function id(s: string) {
  return '"' + s.replace(/"/g, '""') + '"';
}
function qt(table: string) {
  return `${id(T.schema)}.${id(table)}`;
}

let tableExistsPromise: Promise<boolean> | undefined;

// Memoized on the *promise* so concurrent first-callers share one probe.
function clustersTableExists(): Promise<boolean> {
  if (tableExistsPromise) return tableExistsPromise;
  tableExistsPromise = (async () => {
    const p = getPool();
    if (!p) return false;
    try {
      const { rows } = await p.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2 LIMIT 1`,
        [T.schema, T.clusters],
      );
      return rows.length > 0;
    } catch (e) {
      console.error("[db] existence check failed:", (e as Error).message);
      tableExistsPromise = undefined; // allow retry on transient failure
      return false;
    }
  })();
  return tableExistsPromise;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
const MAX_ROWS = Number(process.env.MAX_ROWS || 50000);

export async function fetchDeletions(fromISO: string, toISO: string): Promise<DeletionRecord[] | null> {
  const p = getPool();
  if (!p || !(await clustersTableExists())) return null;

  const c = `c.${id(C.deletedAt)}`;
  // product_count via a correlated subquery scoped to each deleted cluster.
  // This uses the cluster_resource_mapping(cl_id, rs_id) index and only runs
  // for the (small) set of deleted rows in the window — ~2.4x faster than
  // GROUP BY-ing the entire mapping table (measured 481ms vs 1158ms).
  const sql = `
    SELECT
      c.${id(C.id)}::text                AS cluster_id,
      c.${id(C.name)}                    AS cluster_name,
      c.${id(C.topic)}                   AS topic,
      c.${id(C.pageType)}                AS page_type,
      c.${id(C.createdAt)}               AS created_at,
      c.${id(C.updatedAt)}               AS updated_at,
      c.${id(C.deletedAt)}               AS deleted_at,
      c.${id(C.updatedBy)}               AS deleted_by,
      c.${id(C.pageStatus)}              AS page_status,
      c.${id(C.contentId)}::text         AS page_id,
      p.${id(C.projName)}                AS project,
      p.${id(C.projDomain)}              AS project_domain,
      (
        SELECT COUNT(*)::int
        FROM ${qt(T.resourceMap)} rm
        WHERE rm.${id(C.rmClusterId)} = c.${id(C.id)}
          AND rm.${id(C.rmDeletedAt)} IS NULL
      )                                  AS product_count,
      (
        SELECT MAX(pr.${id(PROC.completedAt)})
        FROM ${qt(T.processes)} pr
        WHERE pr.${id(PROC.table)} = $6 AND pr.${id(PROC.rowId)} = c.${id(C.id)}
          AND pr.${id(PROC.type)} = $3 AND pr.${id(PROC.status)} = $5
      )                                  AS last_published_at,
      (
        SELECT MAX(pr.${id(PROC.completedAt)})
        FROM ${qt(T.processes)} pr
        WHERE pr.${id(PROC.table)} = $6 AND pr.${id(PROC.rowId)} = c.${id(C.id)}
          AND pr.${id(PROC.type)} = $4 AND pr.${id(PROC.status)} = $5
      )                                  AS last_unpublished_at
    FROM ${qt(T.clusters)} c
    LEFT JOIN ${qt(T.projects)} p ON p.${id(C.id)} = c.${id(C.projectId)}
    WHERE ${c} IS NOT NULL AND ${c} >= $1 AND ${c} <= $2
    ORDER BY ${c} DESC
    LIMIT ${MAX_ROWS}`;

  const { rows } = await p.query(sql, [
    fromISO, toISO, PROC.publishType, PROC.unpublishType, PROC.doneStatus, T.clusters,
  ]);
  return rows.map(normalizeRow);
}

export async function countCreated(fromISO: string, toISO: string): Promise<number | null> {
  const p = getPool();
  if (!p || !(await clustersTableExists())) return null;
  const cc = `${id(C.createdAt)}`;
  const sql = `SELECT COUNT(*)::int AS n FROM ${qt(T.clusters)}
               WHERE ${cc} IS NOT NULL AND ${cc} >= $1 AND ${cc} <= $2`;
  const { rows } = await p.query(sql, [fromISO, toISO]);
  return rows[0]?.n ?? 0;
}

// Diagnostic mapping for /api/schema.
export async function getSchemaMap() {
  const exists = await clustersTableExists();
  return exists ? { table: `${T.schema}.${T.clusters}`, columns: C } : null;
}

function toISO(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}

// Eagerly open the pool at server boot so the very first request finds warm
// connections (no-op during build when DATABASE_URL is unset).
if (process.env.DATABASE_URL) {
  try { getPool(); } catch { /* ignore */ }
}

function normalizeRow(r: Record<string, unknown>): DeletionRecord {
  const page_status = r.page_status == null ? null : String(r.page_status);
  const product_count =
    r.product_count == null || r.product_count === "" ? null : Number(r.product_count);
  const project = r.project == null ? null : String(r.project);
  const base = {
    cluster_id: r.cluster_id == null ? "" : String(r.cluster_id),
    cluster_name: r.cluster_name == null ? null : String(r.cluster_name),
    created_at: toISO(r.created_at),
    updated_at: toISO(r.updated_at),
    deleted_at: toISO(r.deleted_at) ?? new Date(0).toISOString(),
    deleted_by: r.deleted_by == null ? null : String(r.deleted_by),
    page_status,
    product_count: product_count != null && isNaN(product_count) ? null : product_count,
    // Projects are the customer accounts in this schema, so client mirrors project.
    client: project,
    project,
    project_domain: r.project_domain == null ? null : String(r.project_domain),
    topic: r.topic == null ? null : String(r.topic),
    page_type: r.page_type == null ? null : String(r.page_type),
    page_id: r.page_id == null ? null : String(r.page_id),
    last_modified_by: r.deleted_by == null ? null : String(r.deleted_by),
    deletion_notes: null, // no dedicated notes column in this schema
    deletion_reason_raw: null as string | null,
    last_published_at: toISO(r.last_published_at),
    last_unpublished_at: toISO(r.last_unpublished_at),
  };
  return {
    ...base,
    deletion_reason: deriveReason(base),
    workflow_stage: deriveLifecycle(base),
  };
}
