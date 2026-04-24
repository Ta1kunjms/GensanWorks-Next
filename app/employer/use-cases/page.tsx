"use client";

import { useMemo } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UseCase = {
  name: string;
  description: string;
};

export default function EmployerUseCasesPage() {
  const pages = useMemo(
    () => [
      {
        title: "Table ER-1",
        useCases: [
          { name: "Registration & Sign In", description: "Create and verify employer access, then sign in to manage hiring." },
          { name: "Company Profile Management", description: "Maintain company details, locations, contacts, logos, and documents." },
          { name: "Post Job Vacancy", description: "Create compliant postings with screening, required documents, and workforce data." },
          { name: "Manage Job Postings", description: "Edit, pause, feature, archive, and extend visibility of postings." },
          { name: "Candidate Search", description: "Search applicants and review AI-driven recommendations with throttling." },
          { name: "Application Review", description: "View applicants, notes, tags, and shortlist or reject candidates." },
        ],
      },
      {
        title: "Table ER-2",
        useCases: [
          { name: "Shortlisting", description: "Move candidates to shortlist, manage stages, and collaborate." },
          { name: "Interview Scheduling", description: "Coordinate interviews and send calendar-friendly updates." },
          { name: "Offer & Hiring", description: "Issue offers, mark hires, and capture onboarding handoff details." },
          { name: "Referral Feedback", description: "Provide PESO-style outcomes for referred applicants with auditability." },
          { name: "Analytics & Reports", description: "Track applicants, time-to-fill, sources, and export summaries." },
          { name: "Notifications & Communications", description: "Receive alerts and message candidates with anti-spam controls." },
        ],
      },
    ],
    []
  );

  const downloadMarkdown = () => {
    const content = pages
      .map((page) => {
        const rows = page.useCases
          .map((item) => `- ${item.name}: ${item.description}`)
          .join("\n");
        return `# ${page.title}\n\n${rows}`;
      })
      .join("\n\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "GensanWorks_Employer_Use_Cases.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Employer workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Employer Use Case Descriptions</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              A printable reference for employer workflows, exportable as markdown or via the browser print dialog.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={downloadMarkdown}>
              <Download className="mr-2 h-4 w-4" />
              Download Markdown
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Use Case Descriptions Preview
          </CardTitle>
          <CardDescription>Two export-ready tables for employer workflow documentation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {pages.map((page) => (
            <section key={page.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-950">{page.title}</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Use Case</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.useCases.map((item) => (
                      <tr key={item.name} className="align-top odd:bg-white even:bg-slate-50">
                        <td className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-950">{item.name}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm leading-6 text-slate-600">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}