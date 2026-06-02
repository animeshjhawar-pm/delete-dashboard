// Canonical deletion reasons & workflow stages.
// Designed to be future-proofed: add new entries here and the whole
// dashboard (charts, filters, heatmap) picks them up automatically.

export const REASONS = {
  NO_PRODUCTS: "No Products Tagged",
  BEFORE_PAGE: "Deleted Before Page Generation",
  AFTER_PAGE: "Deleted After Page Generation",
  OTHER: "Other",
} as const;

export const STAGES = {
  NO_STATUS: "Page Status NULL",
  GENERATED: "Page Generated",
  OTHER: "Other Stage",
} as const;

type Pick = {
  page_status: string | null;
  product_count: number | null;
  deletion_reason_raw?: string | null;
};

// Reason logic per spec:
//   product_count = 0            -> No Products Tagged
//   page_status IS NULL          -> Deleted Before Page Generation
//   page_status = "generated"    -> Deleted After Page Generation
//   else                         -> Other
// If the source row already carries an explicit reason, prefer it (future-proof).
export function deriveReason(r: Pick): string {
  if (r.deletion_reason_raw && r.deletion_reason_raw.trim()) {
    return r.deletion_reason_raw.trim();
  }
  if (r.product_count === 0) return REASONS.NO_PRODUCTS;
  if (r.page_status == null || r.page_status === "") return REASONS.BEFORE_PAGE;
  if (r.page_status.toLowerCase() === "generated") return REASONS.AFTER_PAGE;
  return REASONS.OTHER;
}

// Workflow stage is derived & stored separately from reason for reporting.
export function deriveStage(r: Pick): string {
  const s = (r.page_status ?? "").trim().toLowerCase();
  if (!s) return STAGES.NO_STATUS;
  if (s === "generated") return STAGES.GENERATED;
  // Title-case any other known workflow stage so new stages render cleanly.
  return r.page_status!.replace(/\b\w/g, (c) => c.toUpperCase());
}
