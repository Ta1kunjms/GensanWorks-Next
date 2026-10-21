export const dynamic = "force-dynamic";
import { createGetHandler } from "@/lib/api-handler";
import { supabaseAdmin } from "@/lib/supabase";
import { adminUsersQuerySchema } from "@/lib/validation-schemas";
import { paginatedResponse } from "@/lib/api-errors";
import { sanitizeSearchTerm } from "@/lib/postgrest-safe";
import { z } from "zod";

type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

type UserRow = {
  id: string;
  role: "jobseeker" | "employer" | "admin";
  name: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
  createdAt: string;
};

// The retired `users` table is replaced by the three role-profile tables.
export const GET = createGetHandler<AdminUsersQuery>(
  async (ctx, query) => {
    const { search, role: roleFilter, sortOrder, limit, offset } = query!;
    const requestId = ctx.requestId;
    const safeSearch = sanitizeSearchTerm(search);
    const ascending = sortOrder === "asc";
    // Each table returns its first offset+limit rows; the merged list is then paged.
    const window = offset + limit;
    const include = (role: UserRow["role"]) => roleFilter === "all" || roleFilter === role;

    const rows: UserRow[] = [];
    let total = 0;

    if (include("jobseeker")) {
      let q = supabaseAdmin
        .from("jobseekers")
        .select("id, first_name, last_name, email, city, province, created_at", { count: "exact" });
      if (safeSearch) {
        const p = `%${safeSearch}%`;
        q = q.or(`first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p}`);
      }
      const { data, count, error } = await q.order("created_at", { ascending }).range(0, window - 1);
      if (error) throw error;
      total += count ?? 0;
      for (const u of data ?? []) {
        rows.push({
          id: u.id,
          role: "jobseeker",
          name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || null,
          email: u.email,
          city: u.city,
          province: u.province,
          createdAt: u.created_at,
        });
      }
    }

    if (include("employer")) {
      let q = supabaseAdmin
        .from("employers")
        .select("id, establishment_name, email, city, province, created_at", { count: "exact" });
      if (safeSearch) {
        const p = `%${safeSearch}%`;
        q = q.or(`establishment_name.ilike.${p},email.ilike.${p}`);
      }
      const { data, count, error } = await q.order("created_at", { ascending }).range(0, window - 1);
      if (error) throw error;
      total += count ?? 0;
      for (const e of data ?? []) {
        rows.push({
          id: e.id,
          role: "employer",
          name: e.establishment_name,
          email: e.email,
          city: e.city,
          province: e.province,
          createdAt: e.created_at,
        });
      }
    }

    if (include("admin")) {
      let q = supabaseAdmin.from("admins").select("id, name, email, created_at", { count: "exact" });
      if (safeSearch) {
        const p = `%${safeSearch}%`;
        q = q.or(`name.ilike.${p},email.ilike.${p}`);
      }
      const { data, count, error } = await q.order("created_at", { ascending }).range(0, window - 1);
      if (error) throw error;
      total += count ?? 0;
      for (const a of data ?? []) {
        rows.push({ id: a.id, role: "admin", name: a.name, email: a.email, city: null, province: null, createdAt: a.created_at });
      }
    }

    const combinedUsers = rows
      .sort((left, right) => {
        const diff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        return ascending ? diff : -diff;
      })
      .slice(offset, offset + limit);

    return paginatedResponse(combinedUsers, total, limit, offset, requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    querySchema: adminUsersQuerySchema,
  }
);
