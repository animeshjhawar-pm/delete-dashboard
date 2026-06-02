// Canonical lifecycle statuses for a deleted page.
//
// A single status dimension derived from page_status + product tagging +
// publish history. Priority is encoded in deriveLifecycle below.
// Future-proofed: add entries here and the whole dashboard (donut, filter,
// table, KPI) picks them up automatically.
export const LIFECYCLE = {
  NO_PRODUCTS: "No Products Tagged",       // never generated AND 0 products tagged
  YET_TO_GEN: "Yet to be Generated",       // page_status NULL, but had products
  GENERATED: "Generated",                  // generated, never published
  UNPUB_DELETED: "Unpublished & Deleted",  // was published, then unpublished/deleted
} as const;

interface LifecycleInput {
  page_status: string | null;
  // True when a PAGE_GEN process recorded the "No products tagged" remark.
  // This is the system's own signal (shown in the product UI) and only fires
  // for category pages — services/blogs never tag products. We do NOT infer
  // this from a raw product count, which would be wrong for blogs/services.
  no_products_tagged?: boolean;
  last_published_at?: string | null;
}

export function deriveLifecycle(r: LifecycleInput): string {
  const status = (r.page_status ?? "").trim().toLowerCase();

  // Anything that was ever published is, by the time it's deleted, no longer
  // live (deleted pages are never in PUBLISHED state) — so it was unpublished
  // before deletion. This also absorbs the rare edge where the unpublish event
  // wasn't recorded but page_status reverted to GENERATED.
  if (r.last_published_at || status === "published") return LIFECYCLE.UNPUB_DELETED;

  if (status === "generated") return LIFECYCLE.GENERATED;

  // Pre-generation (page_status NULL): a category page that the generator
  // flagged "No products tagged" is exclusive of plain "yet to be generated".
  if (!status) return r.no_products_tagged ? LIFECYCLE.NO_PRODUCTS : LIFECYCLE.YET_TO_GEN;

  // Any future status renders title-cased rather than being dropped.
  return r.page_status!.replace(/\b\w/g, (c) => c.toUpperCase());
}
