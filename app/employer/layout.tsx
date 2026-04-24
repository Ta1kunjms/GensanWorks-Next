import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmployerShell } from "@/components/employer-shell";

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

  return (
    <EmployerShell
      user={{
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
        company: (user as { company?: string | null }).company ?? null,
      }}
    >
      {children}
    </EmployerShell>
  );
}
