import { DeletionRecord } from "@/lib/types";
import { fetchDeletions, countCreated, getSchemaMap, pingDatabase } from "./db";
import { fetchDeletionsDemo, countCreatedDemo } from "./demo";
import { cached, roundISO } from "./cache";

export interface SourceResult {
  records: DeletionRecord[];
  createdInWindow: number | null;
  source: "database" | "demo";
}

// Window data is shared by the dashboard + audit + export endpoints. The cache
// is primarily a single-flight de-dup: concurrent identical requests (e.g. the
// dashboard + events fetches a page load fires together) collapse to ONE query,
// while the short TTL keeps each fresh page load close to live. Tunable.
const WINDOW_TTL_MS = Number(process.env.CACHE_TTL_MS || 5000);

async function loadWindowUncached(fromISO: string, toISO: string, maxRows?: number): Promise<SourceResult> {
  if (process.env.DATABASE_URL) {
    try {
      // Independent queries — run them on separate pool connections in parallel
      // so the window costs one round-trip, not two.
      const [records, createdInWindow] = await Promise.all([
        fetchDeletions(fromISO, toISO, maxRows),
        countCreated(fromISO, toISO),
      ]);
      if (records) {
        return { records, createdInWindow, source: "database" };
      }
    } catch (e) {
      console.error("[source] DB load failed, falling back to demo:", (e as Error).message);
    }
  }
  return {
    records: fetchDeletionsDemo(fromISO, toISO),
    createdInWindow: countCreatedDemo(fromISO, toISO),
    source: "demo",
  };
}

// Tries the real database first; on any failure (no DATABASE_URL, unreachable,
// unmappable schema) falls back to the deterministic demo dataset so the
// dashboard is always functional.
export async function loadWindow(fromISO: string, toISO: string, maxRows?: number, bypassCache?: boolean): Promise<SourceResult> {
  // Manual Refresh bypasses the short TTL cache entirely so it always re-queries
  // the database (a genuinely fresh pull), not a recently-cached result.
  if (bypassCache) return loadWindowUncached(fromISO, toISO, maxRows);
  const key = `win:${roundISO(fromISO)}:${roundISO(toISO)}:${maxRows ?? "d"}`;
  return cached(key, WINDOW_TTL_MS, () => loadWindowUncached(fromISO, toISO, maxRows));
}

export async function describeSource() {
  const url = process.env.DATABASE_URL;
  const hasDb = !!url;

  // Parse host/port (never the credentials) so the deployer can confirm they
  // pointed at the right database.
  let dbHost: string | null = null;
  let dbPort: string | null = null;
  try {
    if (url) {
      const u = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
      dbHost = u.hostname;
      dbPort = u.port || "5432";
    }
  } catch { /* ignore */ }

  let schema = null;
  let ping: { ok: boolean; error?: string; ms: number } | null = null;
  if (hasDb) {
    ping = await pingDatabase();
    try { schema = await getSchemaMap(); } catch { schema = null; }
  }

  return {
    mode: hasDb && schema ? "database" : "demo",
    hasDatabaseUrl: hasDb,
    dbHost,
    dbPort,
    dbReachable: ping ? ping.ok : null,
    dbError: ping && !ping.ok ? ping.error : null,
    pingMs: ping ? ping.ms : null,
    schema,
  };
}
