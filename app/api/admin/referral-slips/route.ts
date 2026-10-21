export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";
import { generateReferralSlipNumber } from "@/lib/referral-slip-number";
import { isUuid } from "@/lib/postgrest-safe";

const schema = z.object({
  jobId: z.string().uuid(),
  applicantId: z.string().uuid(),
  // Optional overrides
  overrideJobTitle: z.string().max(200).optional(),
  overrideCompanyName: z.string().max(200).optional(),
  overrideCompanyAddress: z.string().max(300).optional(),
});

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
    .select("id, employer_id, position_title, industry_code, employers(establishment_name, address, city)")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Fetch jobseeker NSRP profile (jobseekers table has the real data)
  const { data: jsProfile } = await supabaseAdmin
    .from("jobseekers")
    .select("id, first_name, last_name, email, birth_date, gender, phone, house_number, barangay, city, province, nsrp_id")
    .eq("id", applicantId)
    .maybeSingle();

  if (!jsProfile) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });

  // Highest education level, from the live jobseeker_education table.
  const { data: education } = await supabaseAdmin
    .from("jobseeker_education")
    .select("level, course, year_graduated")
    .eq("jobseeker_id", applicantId)
    .order("year_graduated", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const applicantAge = ageFromBirthDate(jsProfile.birth_date);
  const applicantAddress = [jsProfile.house_number, jsProfile.barangay, jsProfile.city, jsProfile.province]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ") || null;

  const applicantFullName = `${jsProfile.first_name ?? ""} ${jsProfile.last_name ?? ""}`.trim();
  const applicantEmail = jsProfile.email ?? null;

  const slipNumber = generateReferralSlipNumber();
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
    // Set after PDF generation in a separate step (referral_slips has no pdf_url column).
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

  // Maintain parity by logging connection in referrals table (non-blocking)
  try {
    const { error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        job_id: jobId,
        jobseeker_id: applicantId,
        employer_id: job.employer_id,
        status: "referred",
      });
    if (referralError) {
      console.error("Failed to insert referral record for parity (non-blocking):", referralError.message);
    }
  } catch (err) {
    console.error("Unexpected error inserting referral record for parity (non-blocking):", err);
  }

  // Check if application already exists for this jobseeker+job combo
  const { data: existingApp } = await supabaseAdmin
    .from("applications")
    .select("id, source")
    .eq("jobseeker_id", applicantId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingApp) {
    if (existingApp.source !== "referred") {
      await supabaseAdmin
        .from("applications")
        .update({ source: "referred", updated_at: new Date().toISOString() })
        .eq("id", existingApp.id);
    }
  } else {
    // Also create a record in the applications table so it shows up in portals
    await supabaseAdmin
      .from("applications")
      .insert({
        job_id: jobId,
        jobseeker_id: applicantId,
        employer_id: job.employer_id,
        status: "pending",
        source: "referred",
        submitted_at: issuedAt.toISOString(),
      });
  }

  // Return the slip data for PDF generation on the client
  const responsePayload = {
    slipId: slip.id,
    slipNumber: slip.slip_number,
    issuedAt: slip.issued_at,
    validUntil: slip.valid_until,
    // Applicant info
    applicant: {
      id: jsProfile.id,
      name: applicantFullName,
      email: applicantEmail,
      age: applicantAge,
      sex: jsProfile.gender ?? null,
      address: applicantAddress,
      contact: jsProfile.phone ?? null,
      education: education ? [education.level, education.course].filter(Boolean).join(" — ") || null : null,
      nsrpId: jsProfile.nsrp_id ?? null,
    },

    // Job info
    job: {
      id: jobId,
      title: overrideJobTitle ?? job.position_title,
      // jobs has no psoc_code; industry_code is the closest classification on record.
      psocCode: job.industry_code ?? null,
    },
    // Employer info
    employer: {
      name: overrideCompanyName ?? (emp?.establishment_name as string ?? ""),
      address: overrideCompanyAddress ?? `${emp?.address ?? ""}, ${emp?.city ?? ""}`.trim().replace(/^,\s*/, ""),
    },
  };

  return NextResponse.json(responsePayload, { status: 201 });
}

const slipPatchSchema = z.object({
  slipId: z.string().refine(isUuid),
  qrCodeUrl: z.string().max(2048).nullable().optional(),
  // Accepted for compatibility with older clients and ignored.
  pdfUrl: z.string().max(2048).nullable().optional(),
  employerId: z.string().optional(),
});

// PATCH: Record the QR code URL after the PDF is generated and send notifications.
// referral_slips has no pdf_url or notified_at columns; the employer to notify
// is the job's owner, never a value from the request body.
export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = slipPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "slipId required" }, { status: 400 });
  const { slipId, qrCodeUrl } = parsedBody.data;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (qrCodeUrl !== undefined) updates.qr_code_url = qrCodeUrl;

  const { data: slip, error: slipError } = await supabaseAdmin
    .from("referral_slips")
    .update(updates)
    .eq("id", slipId)
    .select("slip_number, applicant_id, job_id")
    .maybeSingle();

  if (slipError) return NextResponse.json({ error: "Failed to update referral slip" }, { status: 500 });
  if (!slip) return NextResponse.json({ error: "Slip not found" }, { status: 404 });

  const { data: slipJob } = await supabaseAdmin
    .from("jobs")
    .select("employer_id")
    .eq("id", slip.job_id)
    .maybeSingle();
  const employerId = slipJob?.employer_id ?? null;

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

function ageFromBirthDate(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
