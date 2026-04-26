export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function ArchivedJobVacanciesRedirect() {
  redirect("/admin/archived-jobs");
}