export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

const schema = z.object({
  jobId: z.string().uuid(),
  applicantId: z.string().uuid(),
  // Optional overrides
  overrideJobTitle: z.string().max(200).optional(),
  overrideCompanyName: z.string().max(200).optional(),
  overrideCompanyAddress: z.string().max(300).optional(),
});

function generateSlipNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
  return `RS-${year}-${seq}`;
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { jobId, applicantId, overrideJobTitle, overrideCompanyName, overrideCompanyAddress } = parsed.data;

  // Fetch job details
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, position_title, psoc_code, employers(establishment_name, address, city)")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Fetch jobseeker NSRP profile
  const { data: jsUser } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .eq("id", applicantId)
    .maybeSingle();

  const { data: jsProfile } = await supabaseAdmin
    .from("jobseekers")
    .select("*")
    .eq("user_id", applicantId)
    .maybeSingle();

  if (!jsUser) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });

  const slipNumber = generateSlipNumber();
  const issuedAt = new Date();
  const validUntil = new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  const emp = (Array.isArray(job.employers) ? job.employers[0] : job.employers) as Record<string, unknown> | null;

  // Build slip data
  const slipData = {
    slip_number: slipNumber,
    job_id: jobId,
    applicant_id: applicantId,
    issued_by: user.id,
    issued_at: issuedAt.toISOString(),
    valid_until: validUntil.toISOString(),
    status: "issued",
    // These will be set after PDF generation in a separate step
    pdf_url: null as string | null,
    qr_code_url: null as string | null,
  };

  const { data: slip, error } = await supabaseAdmin
    .from("referral_slips")
    .insert(slipData)
    .select("id, slip_number, issued_at, valid_until")
    .single();

  if (error || !slip) {
    return NextResponse.json({ error: "Failed to create referral slip" }, { status: 500 });
  }

  // Return the slip data for PDF generation on the client
  const responsePayload = {
    slipId: slip.id,
    slipNumber: slip.slip_number,
    issuedAt: slip.issued_at,
    validUntil: slip.valid_until,
    // Applicant info
    applicant: {
      id: jsUser.id,
      name: jsUser.name,
      email: jsUser.email,
      age: jsProfile?.age ?? null,
      sex: jsProfile?.sex ?? null,
      address: jsProfile?.address ?? null,
      contact: jsProfile?.contact_number ?? null,
      education: jsProfile?.education_level ?? null,
      nsrpId: jsProfile?.nsrp_id ?? null,
    },
    // Job info
    job: {
      id: jobId,
      title: overrideJobTitle ?? job.position_title,
      psocCode: job.psoc_code ?? null,
    },
    // Employer info
    employer: {
      name: overrideCompanyName ?? (emp?.establishment_name as string ?? ""),
      address: overrideCompanyAddress ?? `${emp?.address ?? ""}, ${emp?.city ?? ""}`.trim().replace(/^,\s*/, ""),
    },
  };

  return NextResponse.json(responsePayload, { status: 201 });
}

// PATCH: Update pdf_url and qr_code_url after PDF is generated and send notifications
export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { slipId: string; pdfUrl?: string; qrCodeUrl?: string; employerId?: string };
  const { slipId, pdfUrl, qrCodeUrl, employerId } = body;

  if (!slipId) return NextResponse.json({ error: "slipId required" }, { status: 400 });

  const { data: slip } = await supabaseAdmin
    .from("referral_slips")
    .update({ pdf_url: pdfUrl, qr_code_url: qrCodeUrl, notified_at: new Date().toISOString() })
    .eq("id", slipId)
    .select("slip_number, applicant_id, job_id")
    .single();

  if (!slip) return NextResponse.json({ error: "Slip not found" }, { status: 404 });

  const notifyAt = new Date().toISOString();

  // Notify jobseeker with QR code
  await tryCreateNotification({
    userId: slip.applicant_id,
    role: "jobseeker",
    type: "referral_slip",
    title: "Your Referral Slip Has Been Issued",
    message: `Your PESO referral slip (${slip.slip_number}) has been issued. Show the QR code to the employer as a backup. Valid for 30 days.`,
    relatedId: slipId,
    relatedType: "referral_slip",
  });

  // Notify employer if employerId provided
  if (employerId) {
    await tryCreateNotification({
      userId: employerId,
      role: "employer",
      type: "referral_slip",
      title: "Referral Slip Issued for Your Job",
      message: `PESO has issued a referral slip for an applicant to your job posting. Reference: ${slip.slip_number}`,
      relatedId: slipId,
      relatedType: "referral_slip",
    });
  }

  return NextResponse.json({ success: true, notifiedAt: notifyAt });
}
