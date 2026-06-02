import { Suspense } from "react";
import { ConfigForm } from "./ConfigForm";

export const metadata = { title: "Configure · Pages Deletion Dashboard" };

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>}>
      <ConfigForm />
    </Suspense>
  );
}
