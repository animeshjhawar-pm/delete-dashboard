"use client";

import { useCallback, useEffect, useState } from "react";
import { setProjectDomains } from "@/lib/client/domains";
import { Header } from "./Header";
import { Filters } from "./Filters";
import { KpiCards } from "./KpiCards";
import { TrendChart, StageDonut, ReasonBar, HBars, Heatmap } from "./Charts";
import { InsightsPanel } from "./Insights";
import { RecentFeed } from "./RecentFeed";
import { AuditTable } from "./AuditTable";
import { ClusterDrawer } from "./ClusterDrawer";
import { useFilters } from "@/lib/client/useFilters";
import { useDashboard } from "@/lib/client/useDashboard";
import { DeletionRecord } from "@/lib/types";

export function Dashboard() {
  const { queryString } = useFilters();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<DeletionRecord | null>(null);

  const { data, loading, lastUpdated, error } = useDashboard(queryString, refreshKey);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Make project->domain available to favicon badges everywhere.
  useEffect(() => {
    if (data?.projectDomains) setProjectDomains(data.projectDomains);
  }, [data?.projectDomains]);

  const exportHref = `/api/export?${queryString}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header lastUpdated={lastUpdated} loading={loading} onRefresh={refresh} source={data?.source} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 px-4 py-5 sm:px-6">
        <Filters options={data?.filterOptions} exportHref={exportHref} totalMatched={data?.totalMatched} />

        {error && (
          <div className="card border-[var(--critical)] bg-[color-mix(in_srgb,var(--critical)_8%,transparent)] p-3 text-sm text-[var(--critical)]">
            Failed to load dashboard: {error}
          </div>
        )}

        <KpiCards kpis={data?.kpis} loading={loading && !data} />

        <section className="grid grid-cols-12 gap-4">
          <TrendChart points={data?.trend.points ?? []} granularity={data?.trend.granularity ?? "daily"} loading={loading && !data} />
          <StageDonut data={data?.byStage ?? []} loading={loading && !data} />
          <ReasonBar data={data?.byReason ?? []} loading={loading && !data} />
          <HBars title="Deletions by User" subtitle="Deletion ownership & activity" data={data?.byUser ?? []} kind="user" loading={loading && !data} />
          <HBars title="Deletions by Client" subtitle="Abnormal deletion patterns" data={data?.byClient ?? []} kind="client" loading={loading && !data} />
          <Heatmap stages={data?.heatmap.stages ?? []} reasons={data?.heatmap.reasons ?? []} cells={data?.heatmap.cells ?? []} loading={loading && !data} />
        </section>

        <InsightsPanel insights={data?.insights} loading={loading && !data} />

        <section className="grid grid-cols-12 gap-4">
          <AuditTable
            queryString={queryString}
            refreshKey={refreshKey}
            exportHref={exportHref}
            onSelect={setSelected}
            selectedId={selected?.cluster_id}
          />
        </section>

        <section className="grid grid-cols-12 gap-4">
          <RecentFeed records={data?.recent} loading={loading && !data} onSelect={setSelected} />
        </section>

        <footer className="py-6 text-center text-xs text-muted-2">
          Cluster Deletion Audit Dashboard · {data?.source === "demo" ? "Demo dataset" : "Live data"} · Gushwork
        </footer>
      </main>

      <ClusterDrawer record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
