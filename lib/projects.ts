import projectsRaw from "@/data/projects.json";

export interface ProjectInfo {
  id: string;
  name: string;
  url: string;
  domain: string;
}

const PROJECTS = projectsRaw as ProjectInfo[];

// Index by lowercased name for resilient lookups (the deletion table's
// `project` value is matched against this).
const byName = new Map<string, ProjectInfo>();
const byId = new Map<string, ProjectInfo>();
for (const p of PROJECTS) {
  if (p.name) byName.set(p.name.trim().toLowerCase(), p);
  if (p.id) byId.set(p.id, p);
}

export function allProjects(): ProjectInfo[] {
  return PROJECTS;
}

export function resolveProject(value?: string | null): ProjectInfo | null {
  if (!value) return null;
  const v = value.trim();
  return byName.get(v.toLowerCase()) ?? byId.get(v) ?? null;
}

// Best-effort domain for a project string. If we can't resolve it from the
// lookup, try to interpret the value itself as a domain.
export function domainForProject(value?: string | null): string | null {
  const info = resolveProject(value);
  if (info?.domain) return info.domain;
  if (value && /\.[a-z]{2,}$/i.test(value.trim())) {
    return value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
  return null;
}

// Favicon URL via Google's S2 service — reliable, cached, no server fetch.
// An explicit domain (e.g. from the projects join) takes precedence over the
// bundled name->domain lookup.
export function faviconForDomain(domain?: string | null, size = 64): string | null {
  if (!domain) return null;
  const clean = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=${size}`;
}

export function faviconForProject(value?: string | null, size = 64, domain?: string | null): string | null {
  return faviconForDomain(domain ?? domainForProject(value), size);
}
