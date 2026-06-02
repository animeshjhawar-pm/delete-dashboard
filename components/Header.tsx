"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Moon, Sun, Database, FlaskConical, Radio } from "lucide-react";
import { Button, Badge } from "./ui";
import { fmtRelative, fmtDateTime } from "@/lib/format";

const LOGO_URL = "https://cdn.gushwork.ai/v2/gush_new_logo.svg";

export function Header({
  lastUpdated, loading, onRefresh, source, windowFrom,
}: {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  source?: "database" | "demo";
  windowFrom?: string | null;
}) {
  const [dark, setDark] = useState(true);
  const [, force] = useState(0);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

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
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: logo + big, left-aligned title */}
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="Gushwork" width={34} height={34} className="h-8 w-8 shrink-0" />
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">
            Pages Deletion Dashboard
          </h1>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-2.5">
          {source && (
            <Badge tone={source === "database" ? "success" : "warning"} className="hidden sm:inline-flex">
              {source === "database" ? <Database size={12} /> : <FlaskConical size={12} />}
              {source === "database" ? "Live DB" : "Demo data"}
            </Badge>
          )}
          <Link
            href="/configure"
            title="Configure the deletion (d_at) window"
            className="hidden items-center gap-1.5 rounded-md border border-[var(--border)] bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:border-[var(--border-strong)] hover:text-foreground md:inline-flex"
          >
            <Radio size={12} className="text-[var(--success)]" />
            Monitoring since {windowFrom ? fmtDateTime(windowFrom) : "—"}
          </Link>
          <div className="hidden text-right lg:block">
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
