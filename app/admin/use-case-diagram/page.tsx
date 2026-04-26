export const dynamic = "force-dynamic";
"use client";

import { Card } from "@/components/ui/card";

export default function AdminUseCaseDiagramPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Use Case Diagram</h1>
        <p className="mt-1 text-sm text-slate-600">Reference documentation route kept for parity.</p>
      </div>

      <Card className="p-5 text-sm text-slate-700">
        The source project exposes printable use case diagram pages from the admin menu. This target
        route preserves that entry point while the detailed assets are migrated.
      </Card>
    </div>
  );
}