import { Filters, Granularity } from "./types";

const DAY = 86400000;

export const RANGE_PRESETS: Record<string, { label: string; ms: number }> = {
  "24h": { label: "Last 24 Hours", ms: DAY },
  "7d": { label: "Last 7 Days", ms: 7 * DAY },
  "14d": { label: "Last 14 Days", ms: 14 * DAY },
  "30d": { label: "Last 30 Days", ms: 30 * DAY },
  "90d": { label: "Last 90 Days", ms: 90 * DAY },
};

export interface ParsedRange {
  from: string;
  to: string;
  preset: string; // "24h" | ... | "custom"
  label: string;
  prevFrom: string;
  prevTo: string;
}

export function parseRange(sp: URLSearchParams): ParsedRange {
  const preset = sp.get("range") || "7d";
  const now = Date.now();
  if (preset === "custom") {
    const fromStr = sp.get("from");
    const toStr = sp.get("to");
    const from = fromStr ? new Date(fromStr).getTime() : now - 7 * DAY;
    const to = toStr ? new Date(toStr).getTime() : now;
    const span = Math.max(to - from, DAY);
    return {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      preset: "custom",
      label: "period",
      prevFrom: new Date(from - span).toISOString(),
      prevTo: new Date(from).toISOString(),
    };
  }
  const def = RANGE_PRESETS[preset] ?? RANGE_PRESETS["7d"];
  const to = now;
  const from = now - def.ms;
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    preset: preset in RANGE_PRESETS ? preset : "7d",
    label: def.label.replace(/^Last\s+/, "").toLowerCase(),
    prevFrom: new Date(from - def.ms).toISOString(),
    prevTo: new Date(from).toISOString(),
  };
}

export function parseFilters(sp: URLSearchParams): Partial<Filters> {
  const str = (k: string) => {
    const v = sp.get(k);
    return v && v !== "all" && v !== "" ? v : undefined;
  };
  // Multi-select values are comma-separated in the URL.
  const multi = (k: string) => {
    const v = sp.get(k);
    if (!v) return undefined;
    const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  };
  return {
    project: multi("project"),
    user: multi("user"),
    stage: multi("stage"),
    search: str("search"),
  };
}

export function parseMaxRows(sp: URLSearchParams): number | undefined {
  const v = Number(sp.get("maxRows"));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined;
}

export function parseGranularity(sp: URLSearchParams): Granularity | undefined {
  const g = sp.get("granularity");
  // Only Daily / Weekly are supported; anything else falls back to auto.
  if (g === "daily" || g === "weekly") return g;
  return undefined;
}
