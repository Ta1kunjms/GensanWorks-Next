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

// The admin referrals page shows at most the 200 most recently issued slips.
const MAX_SLIPS = 200;

// Only the slip fields and minimal joined job/employer fields the page renders.
const SLIP_LIST_COLUMNS = `
  id, slip_number, status, issued_at, valid_until, applicant_id,
  jobs ( position_title, employers ( establishment_name ) )
`;

const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(MAX_SLIPS).optional(),
  })
  .strict();

async function requireAdmin() {
  // auth() resolves the role from exactly one active role-profile row
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  return Boolean(user?.id) && user?.role === "admin";
}

// GET — most recent referral slips for the admin referrals page
export async function GET(req: Request) {
  const requestId = getRequestId(req);

  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimit = enforceRateLimit({
      key: `admin:referral-slips:list:${clientIp}`,
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

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters", requestId }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("referral_slips")
      .select(SLIP_LIST_COLUMNS)
      .order("issued_at", { ascending: false })
      .limit(parsed.data.limit ?? MAX_SLIPS);

    if (error) {
      console.error("Admin referral slip list failed:", { requestId, code: error.code });
      return NextResponse.json({ error: "Unable to load referral slips", requestId }, { status: 500 });
    }

    return NextResponse.json(
      { slips: data ?? [], requestId },
      { headers: { "x-request-id": requestId } }
    );
  } catch {
    console.error("Admin referral slip list error:", { requestId });
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500 });
  }
}
