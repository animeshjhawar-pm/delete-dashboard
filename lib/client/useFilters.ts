"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Keys that participate in the dashboard query (URL is the single source of truth).
export const FILTER_KEYS = [
  "range", "from", "to", "project", "user", "stage", "search", "granularity", "maxRows",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

// Comma-separated multi-select filters.
const MULTI_KEYS = ["project", "user", "stage"] as const;
type MultiKey = (typeof MULTI_KEYS)[number];

export function useFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo(() => {
    const o: Record<string, string> = {};
    for (const k of FILTER_KEYS) {
      const v = sp.get(k);
      if (v) o[k] = v;
    }
    return o;
  }, [sp]);

  const get = useCallback((k: FilterKey, fallback = "") => params[k] ?? fallback, [params]);

  const setMany = useCallback(
    (updates: Partial<Record<FilterKey, string | undefined>>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [sp, router, pathname],
  );

  const set = useCallback((k: FilterKey, v: string | undefined) => setMany({ [k]: v }), [setMany]);

  // ---- multi-select helpers ----
  const getMulti = useCallback(
    (k: MultiKey): string[] => (params[k] ? params[k].split(",").filter(Boolean) : []),
    [params],
  );
  const setMulti = useCallback(
    (k: MultiKey, values: string[]) => setMany({ [k]: values.length ? values.join(",") : undefined }),
    [setMany],
  );
  const toggleMulti = useCallback(
    (k: MultiKey, value: string) => {
      const cur = params[k] ? params[k].split(",").filter(Boolean) : [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      setMulti(k, next);
    },
    [params, setMulti],
  );

  // Query string sent to the data APIs. Excludes `granularity` — that only
  // affects how the trend is bucketed (done client-side), so changing it must
  // not trigger a full dashboard refetch. It still lives in the URL for sharing.
  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of FILTER_KEYS) if (k !== "granularity" && params[k]) q.set(k, params[k]);
    return q.toString();
  }, [params]);

  const activeCount = useMemo(
    () => MULTI_KEYS.reduce((n, k) => n + (params[k] ? params[k].split(",").filter(Boolean).length : 0), 0),
    [params],
  );

  const reset = useCallback(() => {
    router.replace(`${pathname}?range=${params.range || "since"}`, { scroll: false });
  }, [router, pathname, params.range]);

  return { params, get, set, setMany, getMulti, setMulti, toggleMulti, queryString, activeCount, reset };
}
