"use client";

import { Card } from "@/components/ui/card";

const faq = [
  {
    question: "How do I approve access requests?",
    answer: "Open Access Requests, filter pending submissions, and approve or reject each item.",
  },
  {
    question: "Where are job moderation controls?",
    answer: "Use the Jobs page to review status, open matching detail, and update workflow state.",
  },
  {
    question: "How do I reach analytics?",
    answer: "Open Reports from the sidebar or navigate directly to /admin/reports.",
  },
  {
    question: "How do I sign out?",
    answer: "Use the Sign out button in the admin footer.",
  },
];

export default function AdminHelpPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-950">Help</h1>
        <p className="mt-1 text-sm text-slate-600">Quick answers for the admin portal.</p>
      </div>

      <div className="space-y-3">
        {faq.map((item) => (
          <Card key={item.question} className="p-5">
            <h2 className="font-semibold text-slate-950">{item.question}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}