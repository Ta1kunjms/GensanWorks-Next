import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const accountLookupQuerySchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["jobseeker", "employer", "admin"]),
});

export async function GET(request: NextRequest) {
  const parsedQuery = accountLookupQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid account lookup request" }, { status: 400 });
  }

  const { email, role } = parsedQuery.data;

  try {
    if (role === "admin") {
      const { data, error } = await supabaseAdmin.from("admins").select("id").ilike("email", email).limit(1);

      if (error) throw error;

      return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
    }

    if (role === "employer") {
      const { data, error } = await supabaseAdmin.from("employers").select("id").ilike("email", email).limit(1);

      if (error) throw error;

      return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
    }

    const { data, error } = await supabaseAdmin
      .from("jobseekers")
      .select("id")
      .ilike("email", email)
      .limit(1);

    if (error) throw error;

    return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
  } catch (error) {
    console.error("[auth/account-lookup] Failed to look up account:", error);
    return NextResponse.json({ error: "Unable to check account details" }, { status: 500 });
  }
}
