import { DeletionRecord } from "@/lib/types";
import { deriveLifecycle } from "./derive";
import { allProjects } from "@/lib/projects";

// Deterministic PRNG so the demo dataset is stable across reloads/builds.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface UniverseRow {
  cluster_id: string;
  cluster_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  page_status: string | null;
  product_count: number | null;
  client: string;
  project: string;
  project_domain: string | null;
  topic: string | null;
  page_type: string | null;
  page_id: string | null;
  last_modified_by: string | null;
  deletion_notes: string | null;
  last_published_at: string | null;
  last_unpublished_at: string | null;
  no_products_tagged: boolean;
}

const PAGE_TYPES = ["service", "blog", "category"];
// Every deletion is always attributed to a real user (no bots/automation).
const USERS = [
  "ana.mehta@gushwork.ai", "ravi.kumar@gushwork.ai", "sara.lee@gushwork.ai",
  "tom.becker@gushwork.ai", "priya.nair@gushwork.ai", "leo.martin@gushwork.ai",
  "hridya.das@gushwork.ai", "mudit.kumar@gushwork.ai",
];
const STATUSES: (string | null)[] = [null, null, null, "generated", "generated", "generated"];

const DAY = 86400000;

let cache: UniverseRow[] | null = null;
let cacheDay = -1;

function buildUniverse(now: number): UniverseRow[] {
  const rng = mulberry32(20260602);
  const projects = allProjects();
  const rows: UniverseRow[] = [];
  const TOTAL = 4200;

  // Pre-seed bulk deletion "batches" — many clusters removed at one instant by
  // one user — so the grouped Recent Deletions view has multi-cluster events.
  // Like prod, most deletions belong to a batch; times bias toward recent
  // (rng*rng) so the newest events are visibly multi-cluster.
  const HOUR = 3600000;
  const BATCHES = Array.from({ length: 28 }, (_, k) => ({
    // First few batches sit in the last ~2 days so the newest events are
    // visibly multi-cluster; the rest spread (biased recent) across the window.
    time: k < 5
      ? now - Math.floor((k * 9 + 1 + rng() * 5) * HOUR)
      : now - Math.floor(rng() * rng() * 88 * DAY) - Math.floor(rng() * 6 * HOUR),
    user: USERS[Math.floor(rng() * USERS.length)],
    project: projects[Math.floor(rng() * projects.length)],
  }));

  for (let i = 0; i < TOTAL; i++) {
    let proj = projects[Math.floor(rng() * projects.length)];
    const createdDaysAgo = Math.floor(rng() * 120) + 1; // 1..120 days ago
    const created = now - createdDaysAgo * DAY - Math.floor(rng() * DAY);

    // ~38% of clusters end up deleted; weight deletions toward recent days,
    // with an engineered spike in the last 6 days for insight generation.
    let deleted: number | null = null;
    const willDelete = rng() < 0.38;
    if (willDelete) {
      const lifespan = Math.floor(rng() * Math.min(createdDaysAgo, 45)) * DAY + Math.floor(rng() * DAY);
      let d = created + lifespan;
      // recency bias
      if (rng() < 0.45) d = now - Math.floor(rng() * 7) * DAY - Math.floor(rng() * DAY);
      if (rng() < 0.12) d = now - Math.floor(rng() * 3) * DAY - Math.floor(rng() * DAY); // spike
      if (d > now) d = now - Math.floor(rng() * DAY);
      if (d < created) d = created + Math.floor(rng() * DAY);
      deleted = d;
    }

    // Most deletions snap to a shared batch (same instant, user & project),
    // mirroring prod where bulk removals dominate.
    let delUser = deleted ? USERS[Math.floor(rng() * USERS.length)] : null;
    if (deleted) {
      const cands = BATCHES.filter((b) => b.time >= created + DAY && b.time <= now);
      if (cands.length && rng() < 0.9) {
        const b = cands[Math.floor(rng() * cands.length)];
        deleted = b.time;
        delUser = b.user;
        proj = b.project;
      }
    }

    let status = STATUSES[Math.floor(rng() * STATUSES.length)];
    // product_count: a chunk have zero (drives "No Products Tagged")
    const pc = rng() < 0.34 ? 0 : Math.floor(rng() * 240) + 1;
    const updated = deleted ?? created + Math.floor(rng() * (now - created));
    const pageType = PAGE_TYPES[Math.floor(rng() * PAGE_TYPES.length)];
    const kw = `${proj.name.split(" ")[0].toLowerCase()} ${pageType} keyword ${1000 + i}`;

    // Simulate publish lifecycle for generated pages that were deleted.
    let lastPub: number | null = null;
    let lastUnpub: number | null = null;
    if (deleted && status === "generated") {
      const roll = rng();
      if (roll < 0.45) {
        // published -> unpublished -> deleted
        lastPub = created + Math.floor((deleted - created) * 0.3);
        lastUnpub = created + Math.floor((deleted - created) * 0.7);
      } else if (roll < 0.5) {
        // deleted while still published
        lastPub = created + Math.floor((deleted - created) * 0.5);
        status = "published";
      }
    }

    rows.push({
      cluster_id: `clu_${(100000 + i).toString(36)}`,
      cluster_name: kw,
      created_at: new Date(created).toISOString(),
      updated_at: new Date(updated).toISOString(),
      deleted_at: deleted ? new Date(deleted).toISOString() : null,
      deleted_by: delUser,
      page_status: status,
      product_count: pc,
      // Projects are the client accounts in this schema, so they mirror.
      client: proj.name,
      project: proj.name,
      project_domain: proj.domain,
      topic: `${proj.name}: ${pageType} content overview ${1000 + i}`,
      page_type: pageType,
      page_id: status === "generated" ? `pg_${(200000 + i).toString(36)}` : null,
      last_modified_by: USERS[Math.floor(rng() * USERS.length)],
      deletion_notes:
        deleted && rng() < 0.25 ? "Flagged during routine catalog QA sweep." : null,
      last_published_at: lastPub ? new Date(lastPub).toISOString() : null,
      last_unpublished_at: lastUnpub ? new Date(lastUnpub).toISOString() : null,
      // Only category pages get a "no products tagged" gen failure.
      no_products_tagged: !!deleted && status === null && pageType === "category" && rng() < 0.5,
    });
  }
  return rows;
}

function universe(): UniverseRow[] {
  const now = Date.now();
  const day = Math.floor(now / DAY);
  if (!cache || day !== cacheDay) {
    cache = buildUniverse(now);
    cacheDay = day;
  }
  return cache;
}

export function fetchDeletionsDemo(fromISO: string, toISO: string): DeletionRecord[] {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return universe()
    .filter((r) => r.deleted_at && (() => { const t = new Date(r.deleted_at!).getTime(); return t >= from && t <= to; })())
    .map((r): DeletionRecord => {
      const rec = { ...r, deleted_at: r.deleted_at! };
      return {
        ...rec,
        workflow_stage: deriveLifecycle(rec),
      };
    })
    .sort((a, b) => +new Date(b.deleted_at) - +new Date(a.deleted_at));
}

export function countCreatedDemo(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return universe().filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= from && t <= to;
  }).length;
}
