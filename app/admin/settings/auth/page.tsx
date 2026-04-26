"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function AdminAuthSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Auth Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Authentication provider configuration lives in the target auth stack.</p>
      </div>

      <Card className="p-5">
        <p className="text-sm text-slate-700">
          The target admin portal uses NextAuth and middleware-based route protection. Provider
          configuration is managed outside this UI, but this page keeps the source route available.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/admin/settings" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Back to settings
          </Link>
          <Link href="/login/admin" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Admin login
          </Link>
        </div>
      </Card>
    </div>
  );
}