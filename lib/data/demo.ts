import { DeletionRecord } from "@/lib/types";
import { deriveReason, deriveStage } from "./derive";
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
  deletion_reason_raw: null;
}

const PAGE_TYPES = ["service", "blog", "category"];
const USERS = [
  "ana.mehta@gushwork.ai", "ravi.kumar@gushwork.ai", "sara.lee@gushwork.ai",
  "tom.becker@gushwork.ai", "priya.nair@gushwork.ai", "auto-cleanup@system",
  "leo.martin@gushwork.ai", "ops-bot@system",
];
const STATUSES: (string | null)[] = [null, null, null, "generated", "generated", "in_progress", "draft"];

const DAY = 86400000;

let cache: UniverseRow[] | null = null;
let cacheDay = -1;

function buildUniverse(now: number): UniverseRow[] {
  const rng = mulberry32(20260602);
  const projects = allProjects();
  const rows: UniverseRow[] = [];
  const TOTAL = 4200;

  for (let i = 0; i < TOTAL; i++) {
    const proj = projects[Math.floor(rng() * projects.length)];
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

    const status = STATUSES[Math.floor(rng() * STATUSES.length)];
    // product_count: a chunk have zero (drives "No Products Tagged")
    const pc = rng() < 0.34 ? 0 : Math.floor(rng() * 240) + 1;
    const updated = deleted ?? created + Math.floor(rng() * (now - created));
    const pageType = PAGE_TYPES[Math.floor(rng() * PAGE_TYPES.length)];
    const kw = `${proj.name.split(" ")[0].toLowerCase()} ${pageType} keyword ${1000 + i}`;

    rows.push({
      cluster_id: `clu_${(100000 + i).toString(36)}`,
      cluster_name: kw,
      created_at: new Date(created).toISOString(),
      updated_at: new Date(updated).toISOString(),
      deleted_at: deleted ? new Date(deleted).toISOString() : null,
      deleted_by: deleted ? USERS[Math.floor(rng() * USERS.length)] : null,
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
      deletion_reason_raw: null,
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
        deletion_reason: deriveReason(rec),
        workflow_stage: deriveStage(rec),
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
