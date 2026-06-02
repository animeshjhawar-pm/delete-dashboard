"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardPayload } from "@/lib/types";

export function useDashboard(queryString: string, refreshKey: number) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard?${queryString}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: DashboardPayload) => {
        setData(json);
        setLastUpdated(new Date());
        firstLoad.current = false;
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [queryString, refreshKey]);

  return { data, loading, error, lastUpdated, isInitial: firstLoad.current && !data };
}
