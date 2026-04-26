export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_SORT_FIELDS = new Set(["createdAt", "name", "email", "employmentStatus"]);
const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

function toDateOrNull(raw: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const employmentStatus = searchParams.get("employmentStatus")?.trim();
    const sortBy = ALLOWED_SORT_FIELDS.has(searchParams.get("sortBy") ?? "")
      ? (searchParams.get("sortBy") as string)
      : "createdAt";
    const sortOrder = ALLOWED_SORT_ORDERS.has(searchParams.get("sortOrder") ?? "")
      ? (searchParams.get("sortOrder") as "asc" | "desc")
      : "desc";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);
    const registeredFrom = toDateOrNull(searchParams.get("registeredFrom"));
    const registeredTo = toDateOrNull(searchParams.get("registeredTo"));

    let query = supabaseAdmin
      .from("users")
      .select(
        "id, name, email, phone, city, province, employment_status, employment_type, job_search_status, profile_image, registration_date",
        { count: "exact" }
      );

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern},province.ilike.${pattern}`
      );
    }

    if (employmentStatus && employmentStatus !== "all") {
      query = query.eq("employment_status", employmentStatus);
    }

    if (registeredFrom) {
      query = query.gte("registration_date", registeredFrom.toISOString());
    }

    if (registeredTo) {
      query = query.lte("registration_date", registeredTo.toISOString());
    }

    const sortColumn = sortBy === "name" ? "name"
      : sortBy === "email" ? "email"
      : sortBy === "employmentStatus" ? "employment_status"
      : "registration_date";

    const result = await query
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const rows = (result.data ?? []).map((u: Record<string, unknown>) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      city: u.city,
      province: u.province,
      employmentStatus: u.employment_status,
      employmentType: u.employment_type,
      jobSearchStatus: u.job_search_status,
      profileImage: u.profile_image,
      registrationDate: u.registration_date,
    }));

    return NextResponse.json({ applicants: rows, total: result.count ?? 0, limit, offset });
  } catch (error) {
    console.error("Admin applicants list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}