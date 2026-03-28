import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LiveNavBadges } from "@/components/live-nav-badges";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== "employer") {
    redirect("/login?role=employer");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Employer Portal</h1>
            <p className="text-sm text-slate-600">Manage jobs and review applicants</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/employer/dashboard" className="text-slate-700 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/employer/jobs" className="text-slate-700 hover:text-slate-900">
              Jobs
            </Link>
            <Link href="/employer/profile" className="text-slate-700 hover:text-slate-900">
              Profile
            </Link>
            <LiveNavBadges
              messagesHref="/employer/messages"
              notificationsHref="/employer/notifications"
            />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
