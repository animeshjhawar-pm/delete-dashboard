import { NextRequest, NextResponse } from "next/server";
import { loadWindow } from "@/lib/data/source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Look up a single deleted cluster for the audit drawer. We scan a wide window
// (default 2y) so any deleted cluster is auditable regardless of active filters.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const now = Date.now();
  const from = new Date(now - 730 * 86400000).toISOString();
  const to = new Date(now).toISOString();
  const { records } = await loadWindow(from, to);
  const record = records.find((r) => r.cluster_id === id);
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ record }, { headers: { "Cache-Control": "no-store" } });
}
