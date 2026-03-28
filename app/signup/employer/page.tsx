"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EmployerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    contactPerson: "",
    contactPhone: "",
    establishmentName: "",
    address: "",
    city: "",
    province: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup/employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }

      router.push("/login?role=employer&registered=1");
    } catch {
      setError("Unable to submit employer registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Employer Signup</h1>
        <p className="text-sm text-slate-600 mb-6">Register your organization. Your account will be reviewed.</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <div>
            <label className="block text-sm font-medium mb-1">Contact Person</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.contactPerson} onChange={(e) => onChange("contactPerson", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.contactPhone} onChange={(e) => onChange("contactPhone", e.target.value)} required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Establishment Name</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.establishmentName} onChange={(e) => onChange("establishmentName", e.target.value)} required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.address} onChange={(e) => onChange("address", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.city} onChange={(e) => onChange("city", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Province</label>
            <input className="w-full rounded-md border px-3 py-2" value={form.province} onChange={(e) => onChange("province", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full rounded-md border px-3 py-2" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" className="w-full rounded-md border px-3 py-2" value={form.password} onChange={(e) => onChange("password", e.target.value)} required />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit Employer Registration"}
            </Button>
          </div>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Already registered? <Link href="/login?role=employer" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
