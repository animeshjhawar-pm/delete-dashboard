import { NextRequest } from "next/server";
import { loadWindow } from "@/lib/data/source";
import { parseRange, parseFilters, parseMaxRows } from "@/lib/range";
import { applyFilters } from "@/lib/data/aggregate";
import { DeletionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLUMNS: { key: keyof DeletionRecord; label: string }[] = [
  { key: "deleted_at", label: "Deletion Timestamp" },
  { key: "cluster_id", label: "Cluster ID" },
  { key: "cluster_name", label: "Cluster Name" },
  { key: "client", label: "Client" },
  { key: "project", label: "Project" },
  { key: "deleted_by", label: "Last Modified By" },
  { key: "workflow_stage", label: "Lifecycle Status" },
  { key: "page_status", label: "Page Status" },
  { key: "product_count", label: "Product Count" },
  { key: "created_at", label: "Created Date" },
  { key: "updated_at", label: "Updated Date" },
];

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseRange(sp);
  const filters = parseFilters(sp);
  const { records } = await loadWindow(range.from, range.to, parseMaxRows(sp));
  const rows = applyFilters(records, filters);

  const header = COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) => COLUMNS.map((c) => csvCell(r[c.key])).join(","))
    .join("\n");
  const csv = header + "\n" + body;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cluster-deletions-${range.preset}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
