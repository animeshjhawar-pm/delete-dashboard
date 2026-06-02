"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Moon, Sun, Database, FlaskConical } from "lucide-react";
import { Button, Badge } from "./ui";
import { fmtRelative } from "@/lib/format";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="m5 6 1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">Gushwork</div>
        <div className="text-[11px] text-muted-2">Audit Suite</div>
      </div>
    </div>
  );
}

export function Header({
  lastUpdated, loading, onRefresh, source,
}: {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  source?: "database" | "demo";
}) {
  const [dark, setDark] = useState(true);
  const [, force] = useState(0);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Keep the "updated Xs ago" label fresh.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <div className="hidden flex-col items-center md:flex">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Pages Deletion Dashboard</h1>
          <p className="text-[11px] text-muted-2">Cluster Deletion Audit</p>
        </div>

        <div className="flex items-center gap-2.5">
          {source && (
            <Badge tone={source === "database" ? "success" : "warning"} className="hidden sm:inline-flex">
              {source === "database" ? <Database size={12} /> : <FlaskConical size={12} />}
              {source === "database" ? "Live DB" : "Demo data"}
            </Badge>
          )}
          <div className="hidden text-right sm:block">
            <div className="text-[11px] text-muted-2">Last refreshed</div>
            <div className="text-xs font-medium text-muted tnum">{lastUpdated ? fmtRelative(lastUpdated.toISOString()) : "—"}</div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button variant="accent" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
