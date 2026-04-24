import { redirect } from "next/navigation";

export default function AdminAuthSettingsRedirect() {
  redirect("/admin/settings/auth");
}