export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getClientIp,
  getRequestId,
} from "@/lib/api-guardrails";
import { supabaseAdmin } from "@/lib/supabase";

// Matches the admin referrals page, which loads at most 200 referral slips.
const MAX_APPLICANT_IDS = 200;

const lookupSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(MAX_APPLICANT_IDS),
  })
  .strict();

async function requireAdmin() {
  // auth() resolves the role from exactly one active role-profile row
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  return Boolean(user?.id) && user?.role === "admin";
}

// POST — name/email summaries for the applicants on admin referral slips
export async function POST(req: Request) {
  const requestId = getRequestId(req);

  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:referral-slips:applicants:${clientIp}`,
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterSeconds: rateLimit.resetInSeconds,
        },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    const ids = Array.from(new Set(parsed.data.ids.map((id) => id.toLowerCase())));

    const { data, error } = await supabaseAdmin
      .from("jobseekers")
      .select("id, first_name, last_name, email")
      .in("id", ids);

    if (error) {
      console.error("Admin referral applicant lookup failed:", { requestId, code: error.code });
      return NextResponse.json({ error: "Unable to load applicants", requestId }, { status: 500 });
    }

    return NextResponse.json(
      { applicants: data ?? [], requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch {
    console.error("Admin referral applicant lookup error:", { requestId });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
