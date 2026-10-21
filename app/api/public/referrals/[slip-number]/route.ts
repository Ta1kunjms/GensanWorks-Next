export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/api-guardrails";

// Public QR verification of a referral slip.
// - Anyone: validity, job, employer, and a masked applicant name.
// - Signed-in admin, or the employer the slip is for: full applicant details and
//   the referral id (used by the employer to record the outcome).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ 'slip-number': string }> }
) {
  const { 'slip-number': slipNumber } = await params;

  const rateLimit = enforceRateLimit({
    key: `public:referral-slip:${getClientIp(req)}`,
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!/^[A-Za-z0-9-]{4,64}$/.test(slipNumber)) {
    return NextResponse.json({ error: "Slip not found" }, { status: 404 });
  }

  try {
    const { data: slip, error } = await supabaseAdmin
      .from("referral_slips")
      .select(`
        id,
        slip_number,
        issued_at,
        valid_until,
        status,
        qr_code_url,
        job_id,
        applicant_id,
        jobs (
          position_title,
          employer_id,
          employers (
            establishment_name,
            address,
            city
          )
        )
      `)
      .eq("slip_number", slipNumber)
      .maybeSingle();

    if (error) throw error;
    if (!slip) {
      return NextResponse.json({ error: "Slip not found" }, { status: 404 });
    }

    const job = slip.jobs as unknown as {
      position_title: string;
      employer_id: string;
      employers: { establishment_name: string; address: string; city: string } | null;
    } | null;

    const session = await auth();
    const viewer = session?.user as { id?: string; role?: string } | undefined;
    const privileged =
      viewer?.role === "admin" || (viewer?.role === "employer" && Boolean(job?.employer_id) && viewer.id === job?.employer_id);

    const { data: profile } = await supabaseAdmin
      .from("jobseekers")
      .select("first_name, middle_name, last_name, suffix, email, nsrp_id, profile_image")
      .eq("id", slip.applicant_id)
      .maybeSingle();

    const fullName = profile
      ? [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
          .filter((part): part is string => Boolean(part && String(part).trim()))
          .map((part) => String(part).trim())
          .join(" ")
      : "";
    const maskedName = profile
      ? [String(profile.first_name ?? "").trim(), profile.last_name ? `${String(profile.last_name).trim().charAt(0)}.` : ""]
          .filter(Boolean)
          .join(" ")
      : "";

    let referral: { id: string; status: string } | null = null;
    if (privileged) {
      const { data } = await supabaseAdmin
        .from("referrals")
        .select("id, status")
        .eq("jobseeker_id", slip.applicant_id)
        .eq("job_id", slip.job_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      referral = data ?? null;
    }

    return NextResponse.json({
      id: slip.id,
      slipNumber: slip.slip_number,
      issuedAt: slip.issued_at,
      validUntil: slip.valid_until,
      status: slip.status,
      pdfUrl: slip.qr_code_url ?? null,
      referralId: referral?.id ?? null,
      referralStatus: referral?.status ?? null,
      applicant: privileged
        ? {
            id: slip.applicant_id,
            name: fullName || "Unknown",
            email: profile?.email ?? "",
            nsrpId: profile?.nsrp_id ?? null,
            age: null,
            sex: null,
            profileImage: profile?.profile_image ?? null,
          }
        : {
            id: null,
            name: maskedName || "Registered applicant",
            email: "",
            nsrpId: null,
            age: null,
            sex: null,
            profileImage: null,
          },
      job: {
        id: slip.job_id,
        title: job?.position_title ?? "Unknown Job",
        employerName: job?.employers?.establishment_name ?? "Unknown Employer",
        employerAddress: `${job?.employers?.address ?? ""}, ${job?.employers?.city ?? ""}`.trim().replace(/^, |, $/g, ""),
        employerId: privileged ? job?.employer_id ?? null : null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch referral slip:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
