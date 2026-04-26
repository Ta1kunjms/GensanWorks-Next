export const dynamic = "force-dynamic";
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AccountSecurityPanel } from "@/components/account-security-panel";

const sections = [
  { title: "General", description: "Portal branding, contact details, and content controls." },
  { title: "Notifications", description: "Notification rules and delivery preferences." },
  { title: "Security", description: "Password, session, and account deletion controls." },
  { title: "Auth", description: "Authentication provider settings and login flow links." },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Admin portal configuration and account controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.title} className="p-4">
            <h2 className="font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Authentication settings</h2>
            <p className="text-sm text-slate-600">Open the dedicated auth settings page for provider configuration.</p>
          </div>
          <Link href="/admin/settings/auth" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Open auth settings
          </Link>
        </div>
      </Card>

      <AccountSecurityPanel />
    </div>
  );
}