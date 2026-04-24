"use client";

import { redirect } from "next/navigation";

export default function AdminAnalyticsRedirect() {
  redirect("/admin/reports");
}
