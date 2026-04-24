import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await supabaseAdmin
      .from("employers")
      .select(
        "id, establishment_name, contact_person, contact_phone, email, city, province, account_status, is_archived, created_at",
        { count: "exact" }
      )
      .eq("is_archived", true)
      .order("created_at", { ascending: false });

    const employers = (result.data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      establishmentName: e.establishment_name,
      contactPerson: e.contact_person,
      contactPhone: e.contact_phone,
      email: e.email,
      city: e.city,
      province: e.province,
      accountStatus: e.account_status,
      isArchived: e.is_archived,
      createdAt: e.created_at,
    }));

    return NextResponse.json({ employers, total: employers.length });
  } catch (error) {
    console.error("Admin archived employers list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}