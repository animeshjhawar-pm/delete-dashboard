"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Keys that participate in the dashboard query (URL is the single source of truth).
export const FILTER_KEYS = [
  "range", "from", "to", "client", "project", "user", "stage",
  "status", "search", "granularity",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

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

  // The query string the dashboard/audit/export endpoints consume.
  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of ["range", "from", "to", "client", "project", "user", "stage", "status", "search", "granularity"]) {
      if (params[k]) q.set(k, params[k]);
    }
    return q.toString();
  }, [params]);

  const activeCount = useMemo(
    () => ["client", "project", "user", "stage", "status"].filter((k) => params[k]).length,
    [params],
  );

  const reset = useCallback(() => {
    router.replace(`${pathname}?range=${params.range || "7d"}`, { scroll: false });
  }, [router, pathname, params.range]);

  return { params, get, set, setMany, queryString, activeCount, reset };
}
