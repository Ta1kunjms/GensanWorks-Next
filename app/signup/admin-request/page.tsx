"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Building2, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AdminRequestPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/signup/admin-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setSuccess(true);
      setForm({ name: "", email: "", phone: "", organization: "" });
    } catch {
      setError("Unable to submit request at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Request access"
      subtitle="Submit details for admin approval."
      roleLabel="Admin Portal"
      roleId="admin"
      sideTitle="Admin access"
      sideBullets={[
        "Requires approval from administrators",
        "Use an official email if available",
        "Provide a reachable contact number",
      ]}
      footer={
        <p className="text-sm text-slate-600">
          Already have an admin account? <Link href="/login/admin" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Request submitted successfully.</p> : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2" value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Organization</label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-sky-300 focus:ring-2" value={form.organization} onChange={(e) => onChange("organization", e.target.value)} required />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Submitting request..." : "Request admin access"}
        </Button>
      </form>
    </AuthShell>
  );
}
