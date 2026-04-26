export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function EmployerRootPage() {
  redirect("/employer/dashboard");
}