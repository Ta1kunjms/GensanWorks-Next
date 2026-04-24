"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { Bell, Shield, Lock, Trash2, LogOut } from "lucide-react";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validatePasswordRules } from "@/lib/password-rules";

type NotificationPreferences = {
  jobMatches: boolean;
  applicationStatus: boolean;
  announcements: boolean;
  weeklyDigest: boolean;
  interviewReminders: boolean;
  smsAlerts: boolean;
};

type PrivacyPreferences = {
  showProfile: boolean;
  resumeSearch: boolean;
  shareWithBarangay: boolean;
  dataExportReminders: boolean;
};

type StatusMessage = { type: "success" | "error"; text: string } | null;

const STORAGE_KEY = "jobseeker-settings";

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  jobMatches: true,
  applicationStatus: true,
  announcements: false,
  weeklyDigest: true,
  interviewReminders: true,
  smsAlerts: false,
};

const DEFAULT_PRIVACY: PrivacyPreferences = {
  showProfile: true,
  resumeSearch: false,
  shareWithBarangay: false,
  dataExportReminders: true,
};

export default function JobseekerSettingsPage() {
  const [activeTab, setActiveTab] = useState("notifications");
  const [message, setMessage] = useState<StatusMessage>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState<PrivacyPreferences>(DEFAULT_PRIVACY);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/jobseeker/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) setNotifications(data.notifications);
          if (data.privacy) setPrivacy(data.privacy);
          return;
        }
      } catch (err) {
        console.error("Failed to load settings from API", err);
      }

      // Fallback to localStorage
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed.notifications) setNotifications((prev) => ({ ...prev, ...parsed.notifications }));
        if (parsed.privacy) setPrivacy((prev) => ({ ...prev, ...parsed.privacy }));
      } catch {
        // Ignore
      }
    };

    void loadSettings();
  }, []);

  const liveNewPasswordErrors = useMemo(
    () => (passwordFields.newPassword.length ? validatePasswordRules(passwordFields.newPassword).errors : []),
    [passwordFields.newPassword]
  );

  const liveConfirmPasswordError = useMemo(() => {
    if (!passwordFields.confirmPassword.length) return "";
    return passwordFields.newPassword === passwordFields.confirmPassword ? "" : "Passwords do not match";
  }, [passwordFields.confirmPassword, passwordFields.newPassword]);

  const savePreferences = async (section: "notifications" | "privacy") => {
    setMessage(null);
    try {
      // Save to API
      const res = await fetch("/api/jobseeker/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications, privacy }),
      });

      // Also save to localStorage as backup
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ notifications, privacy }));

      if (res.ok) {
        setMessage({
          type: "success",
          text: `${section === "notifications" ? "Notification" : "Privacy"} preferences updated`,
        });
      } else {
        setMessage({ type: "error", text: "Saved locally, but failed to sync with server" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error. Saved locally only." });
    }
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage(null);
  };

  const handlePrivacyChange = (key: keyof PrivacyPreferences) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage(null);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!passwordFields.currentPassword.trim()) {
      setMessage({ type: "error", text: "Current password is required" });
      return;
    }

    if (!passwordFields.newPassword.trim()) {
      setMessage({ type: "error", text: "New password is required" });
      return;
    }

    const validation = validatePasswordRules(passwordFields.newPassword);
    if (!validation.isValid) {
      setMessage({ type: "error", text: validation.errors[0] ?? "New password is invalid" });
      return;
    }

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordFields.currentPassword,
          newPassword: passwordFields.newPassword,
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setMessage({ type: "error", text: payload.error ?? "Failed to change password" });
        return;
      }

      setMessage({ type: "success", text: payload.message ?? "Password changed successfully" });
      setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/jobseeker/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        setMessage({ type: "error", text: "Failed to delete account" });
        setShowDeleteConfirm(false);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete account" });
      setShowDeleteConfirm(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">Manage account security, notifications, and privacy preferences.</p>
      </div>

      {message ? (
        <Card className={`p-4 ${message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <p className={message.type === "success" ? "text-emerald-700" : "text-red-700"}>{message.text}</p>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Danger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                <p className="mt-1 text-sm text-slate-600">Choose which updates you want to receive.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => savePreferences("notifications")}>
                Save Preferences
              </Button>
            </div>

            <div className="space-y-4">
              <PreferenceRow
                label="Job Matches"
                description="Get notified when new jobs match your profile"
                checked={notifications.jobMatches}
                onChange={() => handleNotificationChange("jobMatches")}
              />
              <PreferenceRow
                label="Application Status"
                description="Updates on your job applications"
                checked={notifications.applicationStatus}
                onChange={() => handleNotificationChange("applicationStatus")}
              />
              <PreferenceRow
                label="Weekly Digest"
                description="Weekly summary of opportunities and activity"
                checked={notifications.weeklyDigest}
                onChange={() => handleNotificationChange("weeklyDigest")}
              />
              <PreferenceRow
                label="Announcements"
                description="Important platform announcements and updates"
                checked={notifications.announcements}
                onChange={() => handleNotificationChange("announcements")}
              />
              <PreferenceRow
                label="Interview Reminders"
                description="Receive reminders about upcoming interviews"
                checked={notifications.interviewReminders}
                onChange={() => handleNotificationChange("interviewReminders")}
              />
              <PreferenceRow
                label="SMS Alerts"
                description="Receive urgent updates by text message"
                checked={notifications.smsAlerts}
                onChange={() => handleNotificationChange("smsAlerts")}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Privacy Settings</h2>
                <p className="mt-1 text-sm text-slate-600">Control how your profile and data are shared.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => savePreferences("privacy")}>
                Save Privacy
              </Button>
            </div>

            <div className="space-y-4">
              <PreferenceRow
                label="Public Profile"
                description="Allow employers to view your profile"
                checked={privacy.showProfile}
                onChange={() => handlePrivacyChange("showProfile")}
              />
              <PreferenceRow
                label="Resume in Search"
                description="Include your resume in job search results"
                checked={privacy.resumeSearch}
                onChange={() => handlePrivacyChange("resumeSearch")}
              />
              <PreferenceRow
                label="Share with Barangay"
                description="Share profile access with PESO/barangay support staff"
                checked={privacy.shareWithBarangay}
                onChange={() => handlePrivacyChange("shareWithBarangay")}
              />
              <PreferenceRow
                label="Data Export Reminders"
                description="Remind me when it is time to download my data"
                checked={privacy.dataExportReminders}
                onChange={() => handlePrivacyChange("dataExportReminders")}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use a strong password that is different from your other accounts.
              </p>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Current Password</label>
                <Input
                  type="password"
                  value={passwordFields.currentPassword}
                  onChange={(event) => setPasswordFields((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">New Password</label>
                <Input
                  type="password"
                  value={passwordFields.newPassword}
                  onChange={(event) => setPasswordFields((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                />
                {liveNewPasswordErrors.length ? (
                  <div className="space-y-1 pt-1">
                    {liveNewPasswordErrors.map((error) => (
                      <p key={error} className="text-xs text-red-600">
                        {error}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordFields.confirmPassword}
                  onChange={(event) => setPasswordFields((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
                {liveConfirmPasswordError ? <p className="pt-1 text-xs text-red-600">{liveConfirmPasswordError}</p> : null}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    changingPassword ||
                    liveNewPasswordErrors.length > 0 ||
                    Boolean(liveConfirmPasswordError) ||
                    !passwordFields.currentPassword.trim() ||
                    !passwordFields.newPassword.trim()
                  }
                >
                  {changingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <AccountSecurityPanel />
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <Card className="border-red-200 bg-red-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-red-900">Danger Zone</h2>
            <p className="mb-4 text-sm text-red-700">These actions cannot be undone. Please proceed with caution.</p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </Card>
        </TabsContent>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete your account? This action cannot be undone and will erase all your profile data, applications, and saved jobs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Tabs>
    </div>
  );
}

type PreferenceRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

function PreferenceRow({ label, description, checked, onChange }: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
      <div>
        <h3 className="font-medium text-slate-900">{label}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4" />
    </div>
  );
}
