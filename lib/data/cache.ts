// Single-flight + short-TTL cache.
//
// Under concurrent load, many users hit the dashboard with the same time
// window. Without coordination, each request would fire its own (heavy) query
// against the read replica. This wrapper:
//   1. de-duplicates *in-flight* identical calls (single-flight) so N concurrent
//      requests for the same key share ONE underlying query, and
//   2. serves the resolved value from memory for a short TTL afterwards.
//
// Cache is per-process; horizontal Railway replicas each keep their own — which
// is fine for a read-mostly audit dashboard. A failed call is never cached.

interface Entry<T> {
  expires: number;
  value: T;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const MAX_ENTRIES = 200;

function sweep() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, e] of store) if (e.expires <= now) store.delete(k);
  // If still oversized, drop oldest-ish (insertion order) entries.
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value as string | undefined;
    if (first === undefined) break;
    store.delete(first);
  }
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = (async () => {
    try {
      const value = await fn();
      store.set(key, { expires: Date.now() + ttlMs, value });
      sweep();
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

// Round an ISO timestamp down to a bucket so that continuously-moving preset
// ranges (Date.now()-based) still collide on a stable cache key.
export function roundISO(iso: string, bucketMs = 30000): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return iso;
  return String(Math.floor(t / bucketMs) * bucketMs);
}
