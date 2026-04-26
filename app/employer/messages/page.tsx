"use client";
export const dynamic = "force-dynamic";
import { useAuth } from "@/lib/auth-client";
import { RealtimeChat } from "@/components/messaging/realtime-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback } from "react";

export default function EmployerMessagesPage() {
  const { data: session, status } = useAuth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const handleStatusChange = useCallback(async (
    jobseekerId: string,
    newStatus: "under_review" | "interview" | "hired" | "rejected"
  ) => {
    await fetch("/api/employer/applications/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobseekerId, status: newStatus }),
    });
  }, []);

  if (status === "loading") return <Skeleton className="h-[calc(100vh-8rem)] rounded-2xl" />;
  if (!userId) return null;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-0.5">Communicate with applicants in real-time</p>
      </div>
      <RealtimeChat
        currentUserId={userId}
        currentUserRole="employer"
        showStatusActions={true}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
