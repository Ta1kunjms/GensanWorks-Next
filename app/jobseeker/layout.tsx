import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { JobseekerSidebar } from "@/components/jobseeker-sidebar";

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
    <div className="flex h-screen bg-slate-50">
      <JobseekerSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
