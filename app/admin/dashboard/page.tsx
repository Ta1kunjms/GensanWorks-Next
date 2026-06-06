export const dynamic = "force-dynamic";

import { getAdminDashboardData } from "./_lib/data-loader";
import { AdminDashboardClient } from "./_components/admin-dashboard-client";

export default async function AdminDashboardPage() {
  const dashboardData = await getAdminDashboardData();

  return <AdminDashboardClient dashboardData={dashboardData} />;
}
