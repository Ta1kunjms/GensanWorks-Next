export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "registration"; // registration | referral | placement | solicitation
    const search = searchParams.get("search")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (reportType === "registration") {
      // 1. APPLICATION REGISTRATION REPORT
      let query = supabaseAdmin.from("jobseekers").select("*");
      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      let filtered = data || [];
      if (search) {
        const queryLower = search.toLowerCase();
        filtered = filtered.filter(item => 
          `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase().includes(queryLower) ||
          (item.email || "").toLowerCase().includes(queryLower) ||
          (item.phone || "").toLowerCase().includes(queryLower) ||
          (item.barangay || "").toLowerCase().includes(queryLower)
        );
      }

      return NextResponse.json({ success: true, data: filtered });

    } else if (reportType === "referral") {
      // 2. PES MONTHLY REFERRAL REPORT
      let query = supabaseAdmin.from("referral_slips").select(`
        id, slip_number, status, issued_at, valid_until, applicant_id, job_id,
        jobs ( position_title, employers ( establishment_name ) )
      `);
      if (startDate) query = query.gte("issued_at", startDate);
      if (endDate) query = query.lte("issued_at", endDate);

      const { data: slips, error } = await query.order("issued_at", { ascending: false });
      if (error) throw error;

      // Manually pull applicant details
      const rawSlips = slips || [];
      const applicantIds = Array.from(new Set(rawSlips.map(s => s.applicant_id).filter(Boolean)));
      let usersMap = new Map();

      if (applicantIds.length > 0) {
        const { data: seekers } = await supabaseAdmin
          .from("jobseekers")
          .select("id, first_name, last_name, email, phone, gender")
          .in("id", applicantIds);
        
        seekers?.forEach(u => {
          usersMap.set(u.id, {
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
            email: u.email,
            phone: u.phone,
            gender: u.gender
          });
        });
      }

      let mapped = rawSlips.map(slip => {
        const user = usersMap.get(slip.applicant_id) || { name: "Unknown", email: "", phone: "", gender: "" };
        const job = slip.jobs as any;
        return {
          id: slip.id,
          slipNumber: slip.slip_number,
          status: slip.status,
          issuedAt: slip.issued_at,
          validUntil: slip.valid_until,
          applicantName: user.name,
          applicantEmail: user.email,
          applicantPhone: user.phone,
          applicantGender: user.gender,
          positionTitle: job?.position_title || "Unknown Job",
          employerName: job?.employers?.establishment_name || "Unknown Employer"
        };
      });

      if (search) {
        const queryLower = search.toLowerCase();
        mapped = mapped.filter(item => 
          item.slipNumber.toLowerCase().includes(queryLower) ||
          item.applicantName.toLowerCase().includes(queryLower) ||
          item.positionTitle.toLowerCase().includes(queryLower) ||
          item.employerName.toLowerCase().includes(queryLower)
        );
      }

      return NextResponse.json({ success: true, data: mapped });

    } else if (reportType === "placement") {
      // 3. MONTHLY PLACEMENT SUMMARY REPORT
      // This focuses on referrals that transitioned to "Hired"
      let query = supabaseAdmin.from("referrals").select(`
        id, created_at, status, job_id, jobseeker_id,
        jobs ( position_title, starting_salary, employment_contract_type, employers ( establishment_name ) )
      `).eq("status", "Hired");

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { data: refs, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Grab jobseeker details
      const rawRefs = refs || [];
      const seekerIds = Array.from(new Set(rawRefs.map(r => r.jobseeker_id).filter(Boolean)));
      let seekersMap = new Map();

      if (seekerIds.length > 0) {
        const { data: seekers } = await supabaseAdmin
          .from("jobseekers")
          .select("id, first_name, last_name, phone, email, barangay")
          .in("id", seekerIds);
        
        seekers?.forEach(u => {
          seekersMap.set(u.id, {
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
            phone: u.phone,
            email: u.email,
            barangay: u.barangay
          });
        });
      }

      let mapped = rawRefs.map(ref => {
        const seeker = seekersMap.get(ref.jobseeker_id) || { name: "Unknown", phone: "", email: "", barangay: "" };
        const job = ref.jobs as any;
        return {
          id: ref.id,
          dateHired: ref.created_at, // Outcome of referral slips, dated at hired transition
          applicantName: seeker.name,
          applicantPhone: seeker.phone,
          applicantEmail: seeker.email,
          applicantBarangay: seeker.barangay || "Not Specified",
          positionTitle: job?.position_title || "Unknown Job",
          employerName: job?.employers?.establishment_name || "Unknown Employer",
          salary: job?.starting_salary || "Negotiable",
          contractType: job?.employment_contract_type === "P" ? "Permanent" : job?.employment_contract_type === "T" ? "Temporary" : "Contractual"
        };
      });

      if (search) {
        const queryLower = search.toLowerCase();
        mapped = mapped.filter(item => 
          item.applicantName.toLowerCase().includes(queryLower) ||
          item.positionTitle.toLowerCase().includes(queryLower) ||
          item.employerName.toLowerCase().includes(queryLower) ||
          item.applicantBarangay.toLowerCase().includes(queryLower)
        );
      }

      return NextResponse.json({ success: true, data: mapped });

    } else if (reportType === "solicitation") {
      // 4. VACANCY SOLICITATION REPORT
      let query = supabaseAdmin.from("jobs").select(`
        id, position_title, vacancies, job_status, created_at,
        employers ( establishment_name )
      `);

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { data: jobsList, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Count vacancies filled in applications/referrals
      const jobIds = (jobsList || []).map(j => j.id);
      let filledMap = new Map<string, number>();

      if (jobIds.length > 0) {
        const { data: hiredCounts } = await supabaseAdmin
          .from("referrals")
          .select("job_id")
          .eq("status", "Hired")
          .in("job_id", jobIds);
        
        hiredCounts?.forEach(h => {
          filledMap.set(h.job_id, (filledMap.get(h.job_id) || 0) + 1);
        });
      }

      let mapped = (jobsList || []).map(job => {
        const solicited = Number(job.vacancies ?? 1);
        const filled = filledMap.get(job.id) || 0;
        const balance = Math.max(0, solicited - filled);
        const emp = job.employers as any;

        return {
          id: job.id,
          datePosted: job.created_at,
          positionTitle: job.position_title,
          employerName: emp?.establishment_name || "Unknown Employer",
          vacanciesSolicited: solicited,
          vacanciesFilled: filled,
          balance,
          status: job.job_status
        };
      });

      if (search) {
        const queryLower = search.toLowerCase();
        mapped = mapped.filter(item => 
          item.positionTitle.toLowerCase().includes(queryLower) ||
          item.employerName.toLowerCase().includes(queryLower)
        );
      }

      return NextResponse.json({ success: true, data: mapped });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });

  } catch (error) {
    console.error("PES Reports API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
