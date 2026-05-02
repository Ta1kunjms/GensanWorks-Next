import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { tryCreateNotification } from "@/lib/notifications";

/**
 * POST /api/matching/feedback
 * Body: { jobId, jobseekerId, signalType }
 * 
 * Records recruiter actions (shortlist, reject, hire) to feed the ML model.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, jobseekerId, signalType } = await req.json();

    if (!jobId || !jobseekerId || !signalType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Map signal type to database interaction types and weights
    const signalMapping: Record<string, { type: string; weight: number }> = {
      shortlisted: { type: "interview_selected", weight: 0.5 },
      rejected: { type: "rejected", weight: -1.0 },
      hired: { type: "hired", weight: 1.0 },
      viewed: { type: "clicked_profile", weight: 0.2 },
    };

    const mapping = signalMapping[signalType] || { type: signalType, weight: 0.0 };

    // 1. Record the feedback signal
    const { error } = await supabaseAdmin
      .from("match_feedback_logs")
      .insert({
        job_id: jobId,
        jobseeker_id: jobseekerId,
        interaction_type: mapping.type,
        weight: mapping.weight,
        metadata: { model_version: "hybrid-v1" },
        captured_at: new Date().toISOString(),
      });

    if (error) throw error;

    // 2. Special handling for shortlisting: Notifications and Application Management
    if (signalType === "shortlisted") {
      try {
        // Fetch Job and Employer info
        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("employer_id, position_title")
          .eq("id", jobId)
          .single();

        if (job) {
          // A. Ensure Application exists and is marked as 'shortlisted'
          const { data: jobseeker } = await supabaseAdmin
            .from("jobseekers")
            .select("first_name, last_name, email")
            .eq("id", jobseekerId)
            .single();

          const { data: existingApp } = await supabaseAdmin
            .from("applications")
            .select("id")
            .eq("job_id", jobId)
            .eq("jobseeker_id", jobseekerId)
            .single();

          let applicationId = existingApp?.id;

          if (!existingApp && jobseeker) {
            const { data: newApp, error: insertError } = await supabaseAdmin
              .from("applications")
              .insert({
                job_id: jobId,
                jobseeker_id: jobseekerId,
                employer_id: job.employer_id,
                status: "shortlisted",
                source: "direct", // Must be 'direct' or 'referred' per CHECK constraint
                submitted_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (insertError) {
              console.error("Failed to create application on shortlist:", insertError);
            }
            applicationId = newApp?.id;
          } else if (existingApp) {
            const { error: updateError } = await supabaseAdmin
              .from("applications")
              .update({ status: "shortlisted" })
              .eq("id", existingApp.id);
              
            if (updateError) {
              console.error("Failed to update application on shortlist:", updateError);
            }
          }

          // B. Calculate Scores for Notification
          const { data: scoreData } = await supabaseAdmin
            .from("job_match_scores")
            .select("suitability_score")
            .eq("job_id", jobId)
            .eq("jobseeker_id", jobseekerId)
            .single();

          const { data: allScores } = await supabaseAdmin
            .from("job_match_scores")
            .select("suitability_score")
            .eq("job_id", jobId);

          const candidateScore = Math.round(scoreData?.suitability_score ?? 0);
          const avgScore = allScores && allScores.length > 0 
            ? Math.round(allScores.reduce((acc, s) => acc + (s.suitability_score || 0), 0) / allScores.length) 
            : 0;

          // C. Notify Jobseeker
          await tryCreateNotification({
            userId: jobseekerId,
            role: "jobseeker",
            type: "application_status",
            title: "You've been Shortlisted!",
            message: `Congratulations! You've been shortlisted for "${job.position_title}". Your match score is ${candidateScore}% (Job Average: ${avgScore}%). If you want to proceed, please visit the PESO office for your referral slip.`,
            relatedId: applicationId,
            relatedType: "application",
          });

          // D. Notify Employer
          await tryCreateNotification({
            userId: job.employer_id,
            role: "employer",
            type: "application",
            title: `Shortlisted: ${jobseeker?.first_name || "A candidate"}`,
            message: `These are the shortlisted candidates for "${job.position_title}". ${jobseeker?.first_name || "A candidate"} has been added with a suitability score of ${candidateScore}%.`,
            relatedId: jobId, // Linking to job so employer can filter by job
            relatedType: "job",
          });
        }
      } catch (notifyError) {
        console.error("Shortlist Notification Error:", notifyError);
        // Don't fail the feedback recording if notification fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
