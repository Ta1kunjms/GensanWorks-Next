"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminRequestPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    notes: "",
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
      setForm({ name: "", email: "", phone: "", organization: "", notes: "" });
    } catch {
      setError("Unable to submit request at this time.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Request Admin Access</h1>
        <p className="text-sm text-slate-600 mb-6">
          Submit your details. An existing admin will review your request.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-700">Request submitted successfully.</p>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full rounded-md border px-3 py-2" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.organization} onChange={(e) => onChange("organization", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea className="w-full rounded-md border px-3 py-2 min-h-24" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Back to <Link href="/signup" className="text-blue-600 hover:underline">signup options</Link>
        </p>
      </Card>
    </div>
  );
}
