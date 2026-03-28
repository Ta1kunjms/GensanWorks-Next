import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LiveNavBadges } from "@/components/live-nav-badges";

export default async function JobseekerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== "jobseeker") {
    redirect("/login?role=jobseeker");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Jobseeker Portal</h1>
            <p className="text-sm text-slate-600">Find jobs and track your applications</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobseeker/dashboard" className="text-slate-700 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/jobseeker/jobs" className="text-slate-700 hover:text-slate-900">
              Jobs
            </Link>
            <Link href="/jobseeker/applications" className="text-slate-700 hover:text-slate-900">
              Applications
            </Link>
            <Link href="/jobseeker/profile" className="text-slate-700 hover:text-slate-900">
              Profile
            </Link>
            <LiveNavBadges
              messagesHref="/jobseeker/messages"
              notificationsHref="/jobseeker/notifications"
            />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
