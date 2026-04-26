export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  
  if (!user?.id || user.role !== "jobseeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: slips, error } = await supabaseAdmin
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
            establishment_name,
            address,
            city
          )
        )
      `)
      .eq("applicant_id", user.id)
      .order("issued_at", { ascending: false });

    if (error) throw error;

    const formattedSlips = slips.map((slip) => {
      const job = slip.jobs as unknown as { position_title: string; employers: { establishment_name: string; address: string; city: string } };
      return {
        id: slip.id,
        slipNumber: slip.slip_number,
        issuedAt: slip.issued_at,
        validUntil: slip.valid_until,
        status: slip.status,
        qrCodeUrl: slip.qr_code_url,
        jobTitle: job?.position_title ?? "Unknown Job",
        employerName: job?.employers?.establishment_name ?? "Unknown Employer",
        employerAddress: `${job?.employers?.address ?? ""}, ${job?.employers?.city ?? ""}`.trim().replace(/^, /, ""),
      };
    });

    return NextResponse.json({ slips: formattedSlips });
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}
