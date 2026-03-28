import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRealtimeMetricsSnapshot } from "@/lib/realtime-metrics";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function GET() {
  try {
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(getRealtimeMetricsSnapshot());
  } catch (error) {
    console.error("Realtime metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
