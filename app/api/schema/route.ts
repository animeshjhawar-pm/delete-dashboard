import { NextResponse } from "next/server";
import { describeSource } from "@/lib/data/source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Diagnostic endpoint: shows whether the app is reading the real DB or the
// demo dataset, and the discovered column mapping. Useful right after wiring
// DATABASE_URL on Railway.
export async function GET() {
  const info = await describeSource();
  return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
}
