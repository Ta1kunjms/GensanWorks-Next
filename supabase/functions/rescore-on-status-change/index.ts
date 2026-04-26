// Supabase Edge Function: auto-rescore jobseeker when their status changes to "actively_looking"
// Deploy with: supabase functions deploy rescore-on-status-change
//
// This function listens to the database webhook trigger set up in Supabase Dashboard:
//   Table: jobseekers, Event: UPDATE, Filter: job_seeking_status=eq.actively_looking

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") ?? "https://gensanworks.com";

serve(async (req: Request) => {
  try {
    const body = await req.json();
    
    // Supabase webhook payload shape
    const record = body.record as { user_id: string; job_seeking_status: string };
    
    if (!record?.user_id || record.job_seeking_status !== "actively_looking") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all active jobs to re-score this jobseeker against
    const { data: activeJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("status", "active")
      .eq("is_published", true)
      .limit(50);

    if (!activeJobs || activeJobs.length === 0) {
      return new Response(JSON.stringify({ message: "No active jobs to score against" }), { status: 200 });
    }

    // Trigger re-scoring for each active job via the matching API
    const scoringPromises = activeJobs.slice(0, 10).map(async (job: { id: string }) => {
      try {
        const res = await fetch(`${appUrl}/api/admin/matching/${job.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-edge-function-key": Deno.env.get("EDGE_FUNCTION_SECRET") ?? "",
          },
          body: JSON.stringify({ jobseekerIds: [record.user_id], forceRescore: true }),
        });
        return { jobId: job.id, status: res.status };
      } catch (err) {
        console.error(`Failed to rescore job ${job.id}:`, err);
        return { jobId: job.id, error: String(err) };
      }
    });

    const results = await Promise.allSettled(scoringPromises);
    const summary = results.map((r) => (r.status === "fulfilled" ? r.value : { error: r.reason }));

    console.log(`Re-scored jobseeker ${record.user_id} against ${activeJobs.length} jobs`, summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobseekerId: record.user_id, 
        jobsScored: summary.length,
        results: summary 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
