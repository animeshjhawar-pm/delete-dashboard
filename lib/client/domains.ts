// Lightweight module-level store mapping project name -> root domain, so any
// component (charts, feed, table) can resolve a project favicon without prop
// drilling. Populated by the Dashboard whenever fresh data arrives.
let domainMap: Record<string, string> = {};

export function setProjectDomains(map: Record<string, string>) {
  domainMap = map || {};
}

export function getProjectDomain(name?: string | null): string | null {
  if (!name) return null;
  return domainMap[name] ?? null;
}
