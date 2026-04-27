import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
    <div className="fixed inset-0 flex overflow-hidden bg-slate-900 p-5 lg:p-6">
      <style dangerouslySetInnerHTML={{ __html: `body { overflow: hidden !important; }` }} />
      <div className="hidden lg:flex lg:h-full lg:shrink-0">
        <AdminSidebar user={user} />
      </div>
      <div className="flex flex-1 flex-col bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image 
                src="/peso-gsc-logo.png" 
                alt="GensanWorks" 
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight leading-none">
                  <span className="text-red-600">Gensan</span>
                  <span className="text-blue-600">Works</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Public Employment Service Office
                </span>
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
