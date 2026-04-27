import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { error } = await supabaseAdmin.rpc('run_sql', {
      sql_query: `
        ALTER TABLE jobseekers
          ADD COLUMN IF NOT EXISTS disability_visual   BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS disability_speech   BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS disability_mental   BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS disability_hearing  BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS disability_physical BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS disability_others   TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_local_1    TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_local_2    TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_local_3    TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_1 TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_2 TEXT,
          ADD COLUMN IF NOT EXISTS preferred_work_location_overseas_3 TEXT,
          ADD COLUMN IF NOT EXISTS unemployed_due_to_calamity BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS other_skills_others TEXT;
      `
    });

    if (error) {
      // If RPC run_sql doesn't exist, we might need a different approach
      return NextResponse.json({ error: error.message, hint: "Make sure you have a 'run_sql' function in your Supabase DB" }, { status: 500 });
    }

    return NextResponse.json({ message: "Schema fixed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
