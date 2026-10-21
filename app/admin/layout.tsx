import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";
import { MobileHeader } from "./mobile-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || role !== "admin") {
    redirect("/login/admin");
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
        {/* Below lg the sidebar is hidden; the mobile header opens it in a drawer. */}
        <MobileHeader user={user} />
        <main className="min-h-0 flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
