import { DeletionRecord } from "@/lib/types";
import { fetchDeletions, countCreated, getSchemaMap } from "./db";
import { fetchDeletionsDemo, countCreatedDemo } from "./demo";

export interface SourceResult {
  records: DeletionRecord[];
  createdInWindow: number | null;
  source: "database" | "demo";
}

// Tries the real database first; on any failure (no DATABASE_URL, unreachable,
// unmappable schema) falls back to the deterministic demo dataset so the
// dashboard is always functional.
export async function loadWindow(fromISO: string, toISO: string): Promise<SourceResult> {
  if (process.env.DATABASE_URL) {
    try {
      const records = await fetchDeletions(fromISO, toISO);
      if (records) {
        const createdInWindow = await countCreated(fromISO, toISO);
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

export async function describeSource() {
  const hasDb = !!process.env.DATABASE_URL;
  let schema = null;
  if (hasDb) {
    try {
      schema = await getSchemaMap();
    } catch {
      schema = null;
    }
  }
  return {
    mode: hasDb && schema ? "database" : "demo",
    hasDatabaseUrl: hasDb,
    schema,
  };
}
