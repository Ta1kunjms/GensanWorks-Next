export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function JobseekerRootPage() {
  redirect("/jobseeker/dashboard");
}
