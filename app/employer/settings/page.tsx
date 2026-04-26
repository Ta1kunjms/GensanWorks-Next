export const dynamic = "force-dynamic";
"use client";

import { useState } from "react";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

type TeamMember = {
  name: string;
  email: string;
  role: string;
};

export default function EmployerSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("profile");
  const [notifications, setNotifications] = useState({
    newApplicants: true,
    jobStatus: true,
    systemAlerts: false,
  });
  const [privacy, setPrivacy] = useState({
    showCompany: true,
    featuredEmployer: false,
  });
  const [company, setCompany] = useState({
    name: user?.company || "",
    logo: "",
    contactEmail: user?.email || "",
    contactNumber: "",
    address: "",
    industry: "",
  });
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [team] = useState<TeamMember[]>([
    { name: "HR Staff 1", email: "hr1@company.com", role: "HR" },
    { name: "HR Staff 2", email: "hr2@company.com", role: "Manager" },
  ]);

  const saveMessage = (title: string, description?: string) => {
    toast({ title, description });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Employer workspace</p>
        <h2 className="text-2xl font-semibold text-slate-950">Settings</h2>
        <p className="text-sm text-slate-600">Configure company information, privacy, team access, and security.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-slate-100 p-1 md:grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your public and internal employer details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company name</Label>
                  <Input id="company-name" value={company.name} onChange={(event) => setCompany((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo URL</Label>
                  <Input id="company-logo" value={company.logo} onChange={(event) => setCompany((prev) => ({ ...prev, logo: event.target.value }))} placeholder="https://" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact email</Label>
                  <Input id="contact-email" type="email" value={company.contactEmail} onChange={(event) => setCompany((prev) => ({ ...prev, contactEmail: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-number">Contact number</Label>
                  <Input id="contact-number" value={company.contactNumber} onChange={(event) => setCompany((prev) => ({ ...prev, contactNumber: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company-address">Company address</Label>
                  <Input id="company-address" value={company.address} onChange={(event) => setCompany((prev) => ({ ...prev, address: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company-industry">Industry</Label>
                  <Input id="company-industry" value={company.industry} onChange={(event) => setCompany((prev) => ({ ...prev, industry: event.target.value }))} />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => saveMessage("Company information saved", "Changes are now reflected in your employer profile.")}>Save Company Info</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose which events should reach your team.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                <label className="flex items-center gap-2">
                  <Checkbox checked={notifications.newApplicants} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, newApplicants: Boolean(checked) }))} />
                  <span className="text-sm text-slate-700">New applicants</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={notifications.jobStatus} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, jobStatus: Boolean(checked) }))} />
                  <span className="text-sm text-slate-700">Job status updates</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={notifications.systemAlerts} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, systemAlerts: Boolean(checked) }))} />
                  <span className="text-sm text-slate-700">System alerts</span>
                </label>
                <div className="md:ml-auto">
                  <Button onClick={() => saveMessage("Notification preferences saved")}>Save Preferences</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control company visibility and featured placement.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                <label className="flex items-center gap-2">
                  <Checkbox checked={privacy.showCompany} onCheckedChange={(checked) => setPrivacy((prev) => ({ ...prev, showCompany: Boolean(checked) }))} />
                  <span className="text-sm text-slate-700">Show company to jobseekers</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={privacy.featuredEmployer} onCheckedChange={(checked) => setPrivacy((prev) => ({ ...prev, featuredEmployer: Boolean(checked) }))} />
                  <span className="text-sm text-slate-700">Opt in for featured employer</span>
                </label>
                <div className="md:ml-auto">
                  <Button onClick={() => saveMessage("Privacy settings saved")}>Save Privacy Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Review collaborators who can help manage hiring tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.map((member) => (
                <div key={member.email} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-950">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                  <Badge className="ml-auto">{member.role}</Badge>
                </div>
              ))}
              <Button variant="outline" onClick={() => saveMessage("Invite flow not wired", "The source page used a mock team flow; this can be connected later.")}>Add Team Member</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-5">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Keep your employer account secure.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" type="password" value={security.currentPassword} onChange={(event) => setSecurity((prev) => ({ ...prev, currentPassword: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input id="new-password" type="password" value={security.newPassword} onChange={(event) => setSecurity((prev) => ({ ...prev, newPassword: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input id="confirm-password" type="password" value={security.confirmPassword} onChange={(event) => setSecurity((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => saveMessage("Password change flow not wired", "Use the account security panel below for export and deletion flows.")}>Update Password</Button>
                </div>
              </CardContent>
            </Card>

            <AccountSecurityPanel />
          </div>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-rose-200 bg-rose-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-rose-900">Danger Zone</CardTitle>
              <CardDescription className="text-rose-700">Use these actions carefully.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-white p-4 text-sm text-slate-700">
                Deleting the account or exporting user data is handled by the account security panel.
              </div>
              <Button variant="destructive" onClick={() => saveMessage("Account deletion not executed", "Use the account security panel for the real deletion workflow.")}>Delete Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}