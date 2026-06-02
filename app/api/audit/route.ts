import { NextRequest, NextResponse } from "next/server";
import { loadWindow } from "@/lib/data/source";
import { parseRange, parseFilters } from "@/lib/range";
import { applyFilters } from "@/lib/data/aggregate";
import { DeletionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SortKey = keyof DeletionRecord;

function cmp(a: DeletionRecord, b: DeletionRecord, key: SortKey, dir: 1 | -1): number {
  const av = a[key] ?? "";
  const bv = b[key] ?? "";
  if (key === "deleted_at" || key === "created_at" || key === "updated_at") {
    return (+new Date(av as string) - +new Date(bv as string)) * dir;
  }
  if (key === "product_count") return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
  return String(av).localeCompare(String(bv)) * dir;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseRange(sp);
  const filters = parseFilters(sp);

  const { records, source } = await loadWindow(range.from, range.to);
  let rows = applyFilters(records, filters);

  const sortKey = (sp.get("sort") || "deleted_at") as SortKey;
  const dir: 1 | -1 = (sp.get("dir") || "desc") === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => cmp(a, b, sortKey, dir));

  const total = rows.length;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(200, Math.max(5, Number(sp.get("pageSize") || 25)));
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return NextResponse.json(
    { rows: pageRows, total, page, pageSize, source },
    { headers: { "Cache-Control": "no-store" } },
  );
}
