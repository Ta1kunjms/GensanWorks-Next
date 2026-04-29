export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requestId = Math.random().toString(36).substring(7);
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const cleanId = id?.trim();

    if (!cleanId || cleanId === "undefined") {
      return NextResponse.json({ error: "Invalid employer ID" }, { status: 400 });
    }

    // Try finding by id
    let { data: profile, error: profileError } = await supabaseAdmin
      .from("employers")
      .select("*")
      .eq("id", cleanId)
      .single();

    // Fallback: try finding by user_id if id didn't work
    if (!profile) {
      const { data: fallbackProfile } = await supabaseAdmin
        .from("employers")
        .select("*")
        .eq("user_id", cleanId)
        .single();
      
      if (fallbackProfile) {
        profile = fallbackProfile;
        profileError = null;
      }
    }

    if (profileError || !profile) {
      console.error(`[API][${requestId}] Profile not found for ID: ${cleanId}`, profileError);
      return NextResponse.json({ 
        error: "Employer profile not found", 
        requestId,
        searchedId: cleanId,
        dbError: profileError?.message 
      }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error(`[API] Unhandled exception:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
