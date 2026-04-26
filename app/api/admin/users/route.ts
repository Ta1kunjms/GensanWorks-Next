export const dynamic = "force-dynamic";
import { createGetHandler } from "@/lib/api-handler";
import { supabaseAdmin } from "@/lib/supabase";
import { adminUsersQuerySchema } from "@/lib/validation-schemas";
import { paginatedResponse } from "@/lib/api-errors";
import { z } from "zod";

type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const GET = createGetHandler<AdminUsersQuery>(
  async (ctx, query) => {
    const { search, role: roleFilter, sortOrder, limit, offset } = query!;
    const requestId = ctx.requestId;

    let regularUsers: Array<Record<string, any>> = [];
    let adminUsers: Array<Record<string, any>> = [];

    // Fetch Jobseekers/Regular Users
    if (roleFilter === "all" || roleFilter === "jobseeker" || roleFilter === "employer") {
      let q = supabaseAdmin.from("users").select(
        "id, name, email, city, province, created_at, role",
        { count: "exact" }
      );
      
      if (search) {
        const pattern = `%${search}%`;
        q = q.or(`name.ilike.${pattern},email.ilike.${pattern}`);
      }
      
      if (roleFilter !== "all") {
        q = q.eq("role", roleFilter);
      }

      const result = await q.order("created_at", { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);
      
      regularUsers = (result.data ?? []).map((u) => ({
        id: u.id,
        role: u.role || "jobseeker",
        name: u.name,
        email: u.email,
        city: u.city,
        province: u.province,
        createdAt: u.created_at,
      }));
    }

    // Fetch Admin Users
    if (roleFilter === "all" || roleFilter === "admin") {
      let q = supabaseAdmin.from("admins").select(
        "id, name, email, created_at",
        { count: "exact" }
      );
      
      if (search) {
        const pattern = `%${search}%`;
        q = q.or(`name.ilike.${pattern},email.ilike.${pattern}`);
      }

      const result = await q.order("created_at", { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);
      
      adminUsers = (result.data ?? []).map((a) => ({
        id: a.id,
        role: "admin",
        name: a.name,
        email: a.email,
        city: null,
        province: null,
        createdAt: a.created_at,
      }));
    }

    const combinedUsers = [...regularUsers, ...adminUsers].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
    }).slice(0, limit);

    // Total counts for pagination
    const [userCountResult, adminCountResult] = await Promise.all([
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("admins").select("id", { count: "exact", head: true }),
    ]);

    const total = (userCountResult.count ?? 0) + (adminCountResult.count ?? 0);

    return paginatedResponse(combinedUsers, total, limit, offset, requestId);
  },
  {
    requireAuth: true,
    allowedRoles: ["admin"],
    querySchema: adminUsersQuerySchema,
  }
);