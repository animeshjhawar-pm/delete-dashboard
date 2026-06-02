import { NextRequest, NextResponse } from "next/server";
import { loadWindow } from "@/lib/data/source";
import { parseRange, parseFilters } from "@/lib/range";
import { applyFilters, groupEvents } from "@/lib/data/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Deletion log grouped into events (clusters deleted together by the same user).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseRange(sp);
  const filters = parseFilters(sp);

  const { records, source } = await loadWindow(range.from, range.to);
  const filtered = applyFilters(records, filters);
  const events = groupEvents(filtered); // already newest-first

  const total = events.length;
  const totalClusters = filtered.length;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize") || 10)));
  const start = (page - 1) * pageSize;
  const pageEvents = events.slice(start, start + pageSize);

  return NextResponse.json(
    { events: pageEvents, total, totalClusters, page, pageSize, source },
    { headers: { "Cache-Control": "no-store" } },
  );
}
