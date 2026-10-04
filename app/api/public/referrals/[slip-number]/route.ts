export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ 'slip-number': string }> }
) {
  const { 'slip-number': slipNumber } = await params;

  try {
    const { data: slip, error } = await supabaseAdmin
      .from("referral_slips")
      .select(`
        id, 
        slip_number, 
        issued_at, 
        valid_until, 
        status, 
        pdf_url,
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
      .single();

    if (error || !slip) {
      return NextResponse.json({ error: "Slip not found" }, { status: 404 });
    }

    // Applicant lookup merged into jobseekers query; age/sex not selected (unsupported in this route).
    const { data: profile } = await supabaseAdmin
      .from("jobseekers")
      .select("first_name, middle_name, last_name, suffix, email, nsrp_id, profile_image")
      .eq("id", slip.applicant_id)
      .single();

    const applicantName = profile
      ? [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
          .filter((part): part is string => Boolean(part && String(part).trim()))
          .map((part) => String(part).trim())
          .join(" ")
      : "";

    const job = slip.jobs as unknown as { position_title: string; employer_id: string; employers: { establishment_name: string; address: string; city: string } };

    const { data: referral } = await supabaseAdmin
      .from("referrals")
      .select("id, status")
      .eq("jobseeker_id", slip.applicant_id)
      .eq("job_id", slip.job_id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      id: slip.id,
      slipNumber: slip.slip_number,
      issuedAt: slip.issued_at,
      validUntil: slip.valid_until,
      status: slip.status,
      pdfUrl: slip.pdf_url,
      referralId: referral?.id ?? null,
      referralStatus: referral?.status ?? null,
      applicant: {
        id: slip.applicant_id,
        name: applicantName || "Unknown",
        email: profile?.email ?? "Unknown",
        nsrpId: profile?.nsrp_id ?? null,
        age: null,
        sex: null,
        profileImage: profile?.profile_image ?? null,
      },
      job: {
        id: slip.job_id,
        title: job?.position_title ?? "Unknown Job",
        employerName: job?.employers?.establishment_name ?? "Unknown Employer",
        employerAddress: `${job?.employers?.address ?? ""}, ${job?.employers?.city ?? ""}`.trim().replace(/^, /, ""),
        employerId: job?.employer_id ?? null,
      }
    });
  } catch (error) {
    console.error("Failed to fetch referral slip:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
