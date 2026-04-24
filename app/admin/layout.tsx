import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== "admin") {
    redirect("/login?role=admin");
  }

  const user = {
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
    image: session.user?.image ?? null,
  };

  return (
    <div className="flex h-screen bg-slate-900 p-5 lg:p-6">
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-full lg:shrink-0">
        <AdminSidebar user={user} />
      </div>
      <div className="flex flex-1 flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">GensanWorks</p>
                <p className="text-xs text-slate-600">Admin Dashboard</p>
              </div>
            </div>
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-auto p-6 lg:p-8">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
