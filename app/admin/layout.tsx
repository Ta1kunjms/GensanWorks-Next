import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LiveNavBadges } from "@/components/live-nav-badges";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-600">GensanWorks management panel</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/dashboard" className="text-slate-700 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/admin/employers" className="text-slate-700 hover:text-slate-900">
              Employers
            </Link>
            <Link
              href="/admin/access-requests"
              className="text-slate-700 hover:text-slate-900"
            >
              Access Requests
            </Link>
            <Link href="/admin/analytics" className="text-slate-700 hover:text-slate-900">
              Analytics
            </Link>
            <LiveNavBadges
              messagesHref="/admin/messages"
              notificationsHref="/admin/notifications"
            />
            <Link href="/" className="text-slate-700 hover:text-slate-900">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
