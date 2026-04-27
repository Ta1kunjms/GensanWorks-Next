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
      .from("jobseekers")
      .select(
        "id, first_name, last_name, email, phone, house_number, barangay, city, province, employment_status, employment_type, preference_full_time, preference_part_time, job_seeking_status, created_at",
        { count: "exact" }
      );

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
      );
    }

    if (employmentStatus && employmentStatus !== "all") {
      query = query.eq("employment_status", employmentStatus);
    }

    if (registeredFrom) {
      query = query.gte("created_at", registeredFrom.toISOString());
    }

    if (registeredTo) {
      query = query.lte("created_at", registeredTo.toISOString());
    }

    const sortColumn = sortBy === "name" ? "first_name"
      : sortBy === "email" ? "email"
      : sortBy === "employmentStatus" ? "employment_status"
      : "created_at";

    const result = await query
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const rows = (result.data ?? []).map((u: Record<string, unknown>) => ({
      id: u.id,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Unknown",
      email: u.email,
      phone: u.phone,
      houseNumber: u.house_number,
      barangay: u.barangay,
      city: u.city,
      province: u.province,
      employmentStatus: u.employment_status,
      employmentType: [
        u.preference_full_time ? "Full-Time" : null,
        u.preference_part_time ? "Part-Time" : null,
        u.employment_type // Fallback to legacy field if present
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "),
      jobSearchStatus: u.job_seeking_status,
      registrationDate: u.created_at,
    }));

    return NextResponse.json({ applicants: rows, total: result.count ?? 0, limit, offset });
  } catch (error) {
    console.error("Admin applicants list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}