"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Building2 } from "lucide-react";

const roles = [
  {
    id: "jobseeker" as const,
    label: "Jobseeker",
    description: "Find your dream job, track applications, and build your career with PESO-supported opportunities.",
    icon: BriefcaseBusiness,
    href: "/login?role=jobseeker",
    accent: "bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    id: "employer" as const,
    label: "Employer",
    description: "Post job vacancies, review applicants, and hire qualified talent through PESO services.",
    icon: Building2,
    href: "/login?role=employer",
    accent: "bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50",
    iconBg: "bg-amber-100 text-amber-600",
  },
];

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fc]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/peso-gsc-logo.png"
                alt="PESO General Santos logo"
                width={44}
                height={44}
                className="h-11 w-11 object-cover"
              />
              <span className="leading-tight">
                <span className="block text-xl font-extrabold tracking-tight text-slate-900">GensanWorks</span>
                <span className="block text-xs font-medium text-slate-500">Public Employment Service Office</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
              <Link href="/" className="transition-colors hover:text-slate-900">Home</Link>
              <Link href="/jobseeker/jobs" className="transition-colors hover:text-slate-900">Services</Link>
              <Link href="/" className="transition-colors hover:text-slate-900">How It Works</Link>
              <Link href="/about" className="transition-colors hover:text-slate-900">About</Link>
              <Link href="/contact" className="transition-colors hover:text-slate-900">Contact</Link>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login?role=jobseeker"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        <main className="flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Get Started with <span className="text-blue-600">GensanWorks</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Choose your role to begin using our platform. Whether you&apos;re looking for work or hiring, we&apos;ll help you get started.
            </p>
          </div>

          <div className="mt-12 grid w-full max-w-4xl gap-6 sm:grid-cols-2">
            {roles.map((role) => (
              <Link
                key={role.id}
                href={role.href}
                className="group flex flex-col items-center justify-center rounded-2xl border bg-white p-8 transition-all hover:shadow-lg"
              >
                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full ${role.iconBg}`}>
                  <role.icon className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{role.label}</h2>
                <p className="mt-3 text-center text-sm text-slate-600">{role.description}</p>
                <span className={`mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${role.accent}`}>
                  Sign in as {role.label}
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        </main>

        <footer className="py-6 text-center text-sm text-slate-500">
          <p>Official Job Assistance Platform of PESO - General Santos City</p>
        </footer>
      </div>
    </div>
  );
}