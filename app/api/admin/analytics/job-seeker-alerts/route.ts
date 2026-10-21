export const dynamic = "force-dynamic";
import { retiredRouteResponse } from "@/lib/retired-route";

// Retired 2026-10-21 (scan batch 4): unused by the UI and built on the removed
// `users` table. The admin dashboard reads /api/admin/dashboard/summary.
export async function GET() {
  return retiredRouteResponse();
}
