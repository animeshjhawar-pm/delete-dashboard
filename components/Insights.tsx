"use client";

import { Lightbulb, TrendingUp, Layers, Tag, User, Building2, Info, AlertTriangle } from "lucide-react";
import { Card, SectionTitle, Skeleton } from "./ui";
import { Insight } from "@/lib/types";
import { cn } from "@/lib/cn";

const ICONS: Record<Insight["kind"], React.ComponentType<{ size?: number }>> = {
  trend: TrendingUp, stage: Layers, reason: Tag, user: User, client: Building2, info: Info,
};

export function InsightsPanel({ insights, loading }: { insights?: Insight[]; loading?: boolean }) {
  return (
    <Card className="p-5 col-span-12 animate-in">
      <SectionTitle
        title="Insights & Alerts"
        subtitle="Automatically generated from current data"
        right={<span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Lightbulb size={16} /></span>}
      />
      {loading || !insights ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins) => {
            const Icon = ICONS[ins.kind] ?? Info;
            const tone =
              ins.severity === "critical" ? "var(--critical)" :
              ins.severity === "warning" ? "var(--warning)" : "var(--accent)";
            return (
              <div
                key={ins.id}
                className={cn("flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface-2 p-3.5")}
                style={{ borderLeft: `3px solid ${tone}` }}
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}>
                  {ins.severity === "warning" || ins.severity === "critical" ? <AlertTriangle size={14} /> : <Icon size={14} />}
                </span>
                <p className="text-[13px] leading-snug text-foreground">{ins.title}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
