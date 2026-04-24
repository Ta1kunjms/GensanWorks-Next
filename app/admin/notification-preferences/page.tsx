"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "gensanworks-admin-notification-preferences";

const preferenceOptions = [
  ["email", "Email updates"],
  ["sms", "SMS updates"],
  ["referrals", "Referral updates"],
  ["applications", "Application updates"],
] as const;

type Preferences = {
  email: boolean;
  sms: boolean;
  referrals: boolean;
  applications: boolean;
};

const DEFAULTS: Preferences = {
  email: true,
  sms: false,
  referrals: true,
  applications: true,
};

export default function AdminNotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPreferences({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) });
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore storage errors
    }
  }, [preferences]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Notification Preferences</h1>
        <p className="mt-1 text-sm text-slate-600">Local fallback preferences for admin alerts and digests.</p>
      </div>

      <Card className="space-y-4 p-5">
        {preferenceOptions.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-900">{label}</span>
            <input
              type="checkbox"
              checked={preferences[key as keyof Preferences]}
              onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
            />
          </label>
        ))}
      </Card>
    </div>
  );
}