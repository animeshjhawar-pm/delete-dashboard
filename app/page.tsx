import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">Loading dashboard…</div>}>
      <Dashboard />
    </Suspense>
  );
}
