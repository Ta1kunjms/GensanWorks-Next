import { NextResponse } from "next/server";

// Routes found unused and broken by the 2026-10-21 system scan. File deletion
// is not available to agents, so these answer 410 Gone with no data access.
export function retiredRouteResponse() {
  return NextResponse.json(
    { error: "This endpoint has been retired" },
    { status: 410, headers: { "Cache-Control": "private, no-store" } }
  );
}
