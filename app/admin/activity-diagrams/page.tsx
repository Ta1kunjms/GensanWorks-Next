"use client";
export const dynamic = "force-dynamic";

import { Card } from "@/components/ui/card";

export default function AdminActivityDiagramsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Activity Diagrams</h1>
        <p className="mt-1 text-sm text-slate-600">Reference diagrams and printable assets for the admin portal.</p>
      </div>

      <Card className="p-5 text-sm text-slate-700">
        Activity diagram rendering is preserved in the source repo. This route stays available while the
        target migration closes parity around the rest of the admin shell.
      </Card>
    </div>
  );
}