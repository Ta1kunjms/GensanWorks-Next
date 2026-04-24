"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">View and manage your admin account details.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={undefined} alt="Admin" />
            <AvatarFallback className="text-2xl font-bold">A</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-950">Admin</h2>
            <p className="text-sm text-slate-600">Administrator</p>
            <p className="mt-2 text-sm text-slate-600">Admin ID: #0I192025</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900">Account Information</h3>
        <p className="mt-1 text-sm text-slate-600 mb-4">Your account details.</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <p className="text-slate-900">Admin</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <p className="text-slate-900">Administrator</p>
          </div>
        </div>
      </Card>
    </div>
  );
}