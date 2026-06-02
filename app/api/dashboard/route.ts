import { NextRequest, NextResponse } from "next/server";
import { loadWindow } from "@/lib/data/source";
import { parseRange, parseFilters, parseGranularity, parseMaxRows } from "@/lib/range";
import {
  applyFilters, buildFilterOptions, computeKpis, trend, autoGranularity,
  byStage, byUser, byClient, insights,
} from "@/lib/data/aggregate";
import { DashboardPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseRange(sp);
  const filters = parseFilters(sp);
  // Recommended default granularity; points are always daily so the client can
  // switch Daily/Weekly without a refetch.
  const granularity = parseGranularity(sp) ?? autoGranularity(range.from, range.to);

  const maxRows = parseMaxRows(sp);
  const nocache = sp.get("nocache") === "1";
  const [cur, prev] = await Promise.all([
    loadWindow(range.from, range.to, maxRows, nocache),
    loadWindow(range.prevFrom, range.prevTo, maxRows, nocache),
  ]);

  // Filter options come from the *unfiltered* window so the user can always
  // widen a selection; everything else reacts to the active filters.
  const filterOptions = buildFilterOptions(cur.records);

  // project name -> domain, for favicons across charts/feed/table.
  const projectDomains: Record<string, string> = {};
  for (const r of cur.records) {
    if (r.project && r.project_domain && !projectDomains[r.project]) {
      projectDomains[r.project] = r.project_domain;
    }
  }
  const filtered = applyFilters(cur.records, filters);
  const prevFiltered = applyFilters(prev.records, filters);

  const payload: DashboardPayload = {
    source: cur.source,
    kpis: computeKpis(filtered, cur.createdInWindow, prevFiltered.length),
    trend: { granularity, points: trend(filtered, range.from, range.to, "daily") },
    byStage: byStage(filtered),
    byUser: byUser(filtered),
    byClient: byClient(filtered),
    insights: insights(filtered, prevFiltered, range.label),
    filterOptions,
    totalMatched: filtered.length,
    projectDomains,
    version: (process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_SHA || "dev").slice(0, 7),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
