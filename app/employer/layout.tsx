import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmployerSidebar } from "@/app/components/employer-sidebar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileHeader } from "./mobile-header";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;

  if (!session || !user || role !== "employer") {
    redirect("/login?role=employer");
  }

  const userData = {
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    company: (user as { company?: string | null }).company ?? null,
  };

  return (
    <div className="flex h-screen bg-slate-900 p-5 lg:p-6">
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-full lg:shrink-0">
        <EmployerSidebar user={userData} />
      </div>
      <div className="flex flex-1 flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <MobileHeader user={userData} />
        <main className="min-h-0 flex-1 overflow-auto p-6 lg:p-8">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
