"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Link from "next/link";

interface PendingApprovalModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  email?: string;
}

export function PendingApprovalModal({
  open,
  onOpenChange,
  email,
}: PendingApprovalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Info className="h-8 w-8 text-amber-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Access Pending Approval
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Your admin access request has been submitted and is currently under review.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Email Address</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{email || "N/A"}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold">What happens next?</span>
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>The super admin will review your request</li>
            <li>You will be notified once your access is approved</li>
            <li>Please check your email for updates</li>
          </ul>
        </div>

        <div className="flex justify-center pt-2">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}