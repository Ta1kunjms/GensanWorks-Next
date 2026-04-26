"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Employer = {
  id: string;
  establishmentName: string;
  contactPerson: string;
  city: string;
  province: string;
  accountStatus: string | null;
  createdAt: string;
};

export default function ArchivedEmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/employers/archived", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { employers?: Employer[] };
        setEmployers(payload.employers ?? []);
      }
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Archived Employers</h1>
        <p className="mt-1 text-sm text-slate-600">Archived employer accounts preserved for compliance review.</p>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading archived employers...</div>
        ) : employers.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No archived employers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employer</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Archived</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employers.map((employer) => (
                  <tr key={employer.id}>
                    <td className="px-4 py-4 font-medium text-slate-950">{employer.establishmentName}</td>
                    <td className="px-4 py-4 text-slate-700">{employer.contactPerson}</td>
                    <td className="px-4 py-4 text-slate-700">{formatDate(employer.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}