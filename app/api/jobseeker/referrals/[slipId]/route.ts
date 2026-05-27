export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  context: { params: Promise<{ slipId: string }> }
) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || user.role !== "jobseeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slipId } = await context.params;

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
        jobs (
          position_title,
          employers (
            establishment_name
          )
        )
      `)
      .eq("id", slipId)
      .eq("applicant_id", user.id)
      .single();

    if (error || !slip) {
      return NextResponse.json({ error: "Referral slip not found" }, { status: 404 });
    }

    const job = slip.jobs as any;
    const formattedSlip = {
      id: slip.id,
      slipNumber: slip.slip_number,
      issuedAt: slip.issued_at,
      validUntil: slip.valid_until,
      status: slip.status,
      qrCodeUrl: slip.qr_code_url,
      jobTitle: job?.position_title ?? "Unknown Job",
      employerName: job?.employers?.establishment_name ?? "Unknown Employer",
    };

    return NextResponse.json({ slip: formattedSlip });
  } catch (error) {
    console.error("Failed to fetch referral slip details:", error);
    return NextResponse.json({ error: "Failed to fetch referral slip details" }, { status: 500 });
  }
}
