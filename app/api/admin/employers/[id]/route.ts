export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Canonical employer columns read by the admin employer detail page and
// breadcrumbs. Credentials (password_hash) and unrelated fields are never selected.
const EMPLOYER_DETAIL_COLUMNS = [
  "id",
  "email",
  "establishment_name",
  "province",
  "city",
  "barangay",
  "address",
  "total_paid_employees",
  "industry",
  "industry_code",
  "contact_person",
  "contact_phone",
  "designation",
  "company_tax_id",
  "business_permit_file",
  "bir_2303_file",
  "company_profile_file",
  "dole_certification_file",
  "profile_image",
  "account_status",
  "created_at",
  "updated_at",
].join(", ");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requestId = Math.random().toString(36).substring(7);
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // auth() resolves the role from exactly one active role-profile row
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const cleanId = id?.trim();

    if (!cleanId || cleanId === "undefined") {
      return NextResponse.json({ error: "Invalid employer ID" }, { status: 400 });
    }

    // employers.id is the employer's Auth user id; there is no separate user_id column
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("employers")
      .select(EMPLOYER_DETAIL_COLUMNS)
      .eq("id", cleanId)
      .maybeSingle();

    if (profileError) {
      console.error(`[API][${requestId}] Employer profile lookup failed`, { code: profileError.code });
      return NextResponse.json(
        { error: "Unable to load employer profile", requestId },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json({
        error: "Employer profile not found",
        requestId,
        searchedId: cleanId,
      }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error(`[API] Unhandled exception:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
