export const dynamic = "force-dynamic";
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type UserRecord = {
  id: string;
  role: "admin" | "jobseeker";
  name: string;
  email: string;
  city: string | null;
  province: string | null;
  createdAt: string | null;
};

type ResponsePayload = {
  users: UserRecord[];
  total: number;
  limit: number;
  offset: number;
};

const ROLE_OPTIONS = ["all", "admin", "jobseeker"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageSize = 20;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search, role]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (role !== "all") params.set("role", role);
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));

        const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load users");
        }

        const payload = (await response.json()) as ResponsePayload;
        setUsers(payload.users ?? []);
        setTotal(payload.total ?? 0);
      } catch {
        setError("Unable to load users");
        setUsers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, role, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const deleteUser = async (id: string, userRole: UserRecord["role"]) => {
    const confirmed = window.confirm(`Delete this ${userRole} account? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}?role=${userRole}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setPage(1);
    } catch {
      setError("Unable to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Users</h1>
          <p className="mt-1 text-sm text-slate-600">Manage admin and jobseeker accounts.</p>
        </div>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search users by name or email"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
      />

      {error ? <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card> : null}

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-950">{user.name}</div>
                      <div className="mt-1 text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 align-top capitalize text-slate-700">{user.role}</td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {user.city || user.province ? `${user.city ?? ""}${user.city && user.province ? ", " : ""}${user.province ?? ""}` : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {user.createdAt ? formatDate(user.createdAt) : "Unknown"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={deletingId === user.id}
                          onClick={() => void deleteUser(user.id, user.role)}
                        >
                          {deletingId === user.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}