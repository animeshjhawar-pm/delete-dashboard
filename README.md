# Pages Deletion Dashboard — Cluster Deletion Audit

An internal analytics dashboard that gives complete visibility into cluster (page)
deletions: how many, when, who, why, at what workflow stage, and which projects are
most impacted — with a full searchable audit trail and per-cluster investigation drawer.

Built with **Next.js 16 (App Router)**, **Tailwind v4**, **Recharts**, and **pg**,
themed with a Binance-inspired design language (`DESIGN.md`). Designed to deploy on **Railway**.

## Data source

The dashboard reads live data from the `gw_stormbreaker` Postgres schema:

| Dashboard field | Source |
|---|---|
| cluster id / name | `clusters.id` / `clusters.primary_kw` (+ `topic`) |
| created / updated / deleted | `clusters.c_at` / `u_at` / `d_at` |
| deleted by | `clusters.u_by` |
| page status | `clusters.page_status` |
| product count | `COUNT(cluster_resource_mapping)` (active) per cluster |
| project + favicon | join `clusters.p_id → projects.name` / `projects.root_domain` |

A cluster is "deleted" when `d_at IS NOT NULL`. **Deletion reason** is derived:
`product_count = 0` → *No Products Tagged*; else `page_status NULL` → *Deleted Before
Page Generation*; `page_status = generated` → *Deleted After Page Generation*; else *Other*.

If `DATABASE_URL` is **not** set (or the schema is unreachable), the app automatically
falls back to a deterministic **demo dataset** so it always renders. All identifiers
are env-overridable — see `.env.example`.

## Features

- Time-range filter (24h / 7d / 14d / 30d / 90d / custom) + Project / User / Reason / Stage / Status filters, **persisted in the URL**
- KPI cards: total deleted, deletion rate, unique deleters, top reason, most impacted client — with week-over-week deltas
- Charts: deletion trend (hourly/daily/weekly), workflow-stage donut, reason bar, by-user & by-client horizontal bars, stage × reason heatmap
- Auto-generated **Insights & Alerts**
- Audit log: search, sort, pagination, column filters, **CSV export**, click-to-open detail drawer
- Recent deletions feed
- Project favicons (via `projects.root_domain`), dark/light theme, responsive

## Local development

```bash
npm install
cp .env.example .env   # optionally set DATABASE_URL; omit to use demo data
npm run dev            # http://localhost:3000
```

## Deploy on Railway

1. Create a Railway project from this repo (it auto-detects `railway.json` → `Dockerfile`).
2. Set the `DATABASE_URL` environment variable on the service.
3. Railway builds the Docker image and serves the Next.js standalone server; health
   checks hit `/api/health`. Visit `/api/schema` after deploy to confirm it's reading
   the live DB and to see the discovered column mapping.

## Diagnostics

- `GET /api/health` — liveness
- `GET /api/schema` — reports `database` vs `demo` mode and the active column mapping
