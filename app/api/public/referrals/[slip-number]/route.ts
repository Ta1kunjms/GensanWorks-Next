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

    // Fetch applicant basic info
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", slip.applicant_id)
      .single();

    const { data: profile } = await supabaseAdmin
      .from("jobseekers")
      .select("nsrp_id, age, sex, profile_image")
      .eq("id", slip.applicant_id)
      .single();

    const job = slip.jobs as unknown as { position_title: string; employers: { establishment_name: string; address: string; city: string } };

    return NextResponse.json({
      id: slip.id,
      slipNumber: slip.slip_number,
      issuedAt: slip.issued_at,
      validUntil: slip.valid_until,
      status: slip.status,
      pdfUrl: slip.pdf_url,
      applicant: {
        name: user?.name ?? "Unknown",
        email: user?.email ?? "Unknown",
        nsrpId: profile?.nsrp_id ?? null,
        age: profile?.age ?? null,
        sex: profile?.sex ?? null,
        profileImage: profile?.profile_image ?? null,
      },
      job: {
        title: job?.position_title ?? "Unknown Job",
        employerName: job?.employers?.establishment_name ?? "Unknown Employer",
        employerAddress: `${job?.employers?.address ?? ""}, ${job?.employers?.city ?? ""}`.trim().replace(/^, /, ""),
      }
    });
  } catch (error) {
    console.error("Failed to fetch referral slip:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
