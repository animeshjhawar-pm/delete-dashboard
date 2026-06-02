// Canonical deletion reasons & lifecycle statuses.
// Future-proofed: add entries here and the whole dashboard (charts, filters)
// picks them up automatically.

export const REASONS = {
  NO_PRODUCTS: "No Products Tagged",
  HAS_PRODUCTS: "Products Tagged",
  UNKNOWN: "Unknown",
} as const;

// Lifecycle status of a page at the moment it was deleted. Derived from
// page_status PLUS the publish/unpublish process history, so a page that was
// published then unpublished (which reverts page_status to GENERATED) is
// distinguished from one that was only ever generated.
export const LIFECYCLE = {
  YET_TO_GEN: "Yet to be Generated",     // page_status NULL
  GENERATED: "Generated",                // generated, never published
  UNPUB_DELETED: "Unpublished & Deleted",// published -> unpublished -> deleted
  PUB_DELETED: "Published & Deleted",    // deleted while still published (rare)
} as const;

interface ReasonInput {
  product_count: number | null;
  deletion_reason_raw?: string | null;
}

// Reason is now purely about product tagging (orthogonal to lifecycle).
export function deriveReason(r: ReasonInput): string {
  if (r.deletion_reason_raw && r.deletion_reason_raw.trim()) return r.deletion_reason_raw.trim();
  if (r.product_count === 0) return REASONS.NO_PRODUCTS;
  if (r.product_count != null && r.product_count > 0) return REASONS.HAS_PRODUCTS;
  return REASONS.UNKNOWN;
}

interface LifecycleInput {
  page_status: string | null;
  last_published_at?: string | null;
  last_unpublished_at?: string | null;
}

export function deriveLifecycle(r: LifecycleInput): string {
  const everPub = !!r.last_published_at;
  const everUnpub = !!r.last_unpublished_at;

  if (everPub || everUnpub) {
    // If the last publish-related action was an unpublish, it's the classic
    // published -> unpublished -> deleted flow.
    const unpubIsLatest =
      everUnpub && (!everPub || new Date(r.last_unpublished_at!) >= new Date(r.last_published_at!));
    return unpubIsLatest ? LIFECYCLE.UNPUB_DELETED : LIFECYCLE.PUB_DELETED;
  }

  const s = (r.page_status ?? "").trim().toLowerCase();
  if (!s) return LIFECYCLE.YET_TO_GEN;
  if (s === "generated") return LIFECYCLE.GENERATED;
  if (s === "published") return LIFECYCLE.PUB_DELETED;
  // Any future status renders title-cased rather than being dropped.
  return r.page_status!.replace(/\b\w/g, (c) => c.toUpperCase());
}
