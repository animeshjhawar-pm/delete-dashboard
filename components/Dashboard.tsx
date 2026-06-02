"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { setProjectDomains } from "@/lib/client/domains";
import { RANGE_PRESETS } from "@/lib/range";
import { Header } from "./Header";
import { Filters } from "./Filters";
import { KpiCards } from "./KpiCards";
import { TrendChart, StageDonut, HBars } from "./Charts";
import { InsightsPanel } from "./Insights";
import { AuditTable } from "./AuditTable";
import { DetailDrawer } from "./ClusterDrawer";
import { useFilters } from "@/lib/client/useFilters";
import { useDashboard } from "@/lib/client/useDashboard";
import { DeletionRecord, DeletionEvent } from "@/lib/types";

export function Dashboard() {
  const { queryString, params } = useFilters();
  const [refreshKey, setRefreshKey] = useState(0);

  // Start of the analyzed deletion (d_at) window — shown in the header chip.
  const windowFrom = useMemo(() => {
    const range = params.range || "7d";
    if (range === "custom") return params.from ?? null;
    const def = RANGE_PRESETS[range];
    return def ? new Date(Date.now() - def.ms).toISOString() : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.range, params.from, refreshKey]);
  const [selectedRecord, setSelectedRecord] = useState<DeletionRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DeletionEvent | null>(null);

  const { data, loading, lastUpdated, error } = useDashboard(queryString, refreshKey);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Make project->domain available to favicon badges everywhere.
  useEffect(() => {
    if (data?.projectDomains) setProjectDomains(data.projectDomains);
  }, [data?.projectDomains]);

  const exportHref = `/api/export?${queryString}`;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Real-time activity indicator — filters update in place without a reload */}
      {loading && <div className="topbar"><span /></div>}
      <Header lastUpdated={lastUpdated} loading={loading} onRefresh={refresh} source={data?.source} windowFrom={windowFrom} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 px-4 pb-5 sm:px-6">
        {/* Global filters stick just below the navbar while scrolling */}
        <div className="sticky top-16 z-20 -mx-4 bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <Filters options={data?.filterOptions} exportHref={exportHref} totalMatched={data?.totalMatched} />
        </div>

        {error && (
          <div className="card border-[var(--critical)] bg-[color-mix(in_srgb,var(--critical)_8%,transparent)] p-3 text-sm text-[var(--critical)]">
            Failed to load dashboard: {error}
          </div>
        )}

        <KpiCards kpis={data?.kpis} byStage={data?.byStage} loading={loading && !data} />

        {/* Consolidated recent deletions + audit log — full width, below KPIs */}
        <section className="grid grid-cols-12 gap-4">
          <AuditTable
            queryString={queryString}
            refreshKey={refreshKey}
            exportHref={exportHref}
            onSelect={(r) => { setSelectedEvent(null); setSelectedRecord(r); }}
            onSelectEvent={(e) => { setSelectedRecord(null); setSelectedEvent(e); }}
            selectedId={selectedRecord?.cluster_id}
            selectedEventKey={selectedEvent?.key}
          />
        </section>

        <section className="grid grid-cols-12 gap-4">
          <TrendChart points={data?.trend.points ?? []} granularity={data?.trend.granularity ?? "daily"} loading={loading && !data} />
          <StageDonut data={data?.byStage ?? []} loading={loading && !data} />
          <HBars title="Deleted Clusters by Last Editor" subtitle="Last person to edit the deleted cluster" data={data?.byUser ?? []} kind="user" loading={loading && !data} colSpan="lg:col-span-6" />
          <HBars title="Deletions by Client" subtitle="Abnormal deletion patterns" data={data?.byClient ?? []} kind="client" loading={loading && !data} colSpan="lg:col-span-6" />
        </section>

        {/* Insights & Alerts — last section */}
        <InsightsPanel insights={data?.insights} loading={loading && !data} />

        <footer className="py-6 text-center text-xs text-muted-2">
          Cluster Deletion Audit Dashboard · {data?.source === "demo" ? "Demo dataset" : "Live data"} · Gushwork
        </footer>
      </main>

      <DetailDrawer
        event={selectedEvent}
        record={selectedRecord}
        onSelectRecord={(r) => setSelectedRecord(r)}
        onBack={() => setSelectedRecord(null)}
        onClose={() => { setSelectedRecord(null); setSelectedEvent(null); }}
      />
    </div>
  );
}
