import { formatDistanceToNowStrict } from "date-fns";

// All timestamps are stored in UTC and displayed in IST (Asia/Kolkata),
// pinned explicitly so every viewer sees IST regardless of their browser zone.
export const DISPLAY_TZ = "Asia/Kolkata";

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TZ, month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TZ, month: "short", day: "numeric", year: "numeric",
});
const bucketFmt = new Intl.DateTimeFormat("en-US", { timeZone: DISPLAY_TZ, month: "short", day: "numeric" });

function valid(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDateTime(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? dateTimeFmt.format(d) : "—";
}

export function fmtDate(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? dateFmt.format(d) : "—";
}

export function fmtRelative(iso: string | null | undefined): string {
  const d = valid(iso);
  return d ? formatDistanceToNowStrict(d, { addSuffix: true }) : "—";
}

export function fmtBucket(iso: string, _granularity: "daily" | "weekly"): string {
  const d = valid(iso);
  return d ? bucketFmt.format(d) : "—";
}

export function initials(s: string | null | undefined): string {
  if (!s) return "?";
  const clean = s.split("@")[0].replace(/[._-]+/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return s[0]?.toUpperCase() ?? "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
