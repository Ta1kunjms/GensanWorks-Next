import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignupLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-6">
      <div className="mx-auto max-w-5xl py-16">
        <h1 className="text-4xl font-bold text-slate-900 text-center">Create Your Account</h1>
        <p className="text-center text-slate-600 mt-3 mb-10">
          Choose your role to continue with the correct signup flow.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <h2 className="text-xl font-semibold">Job Seeker</h2>
            <p className="mt-2 text-sm text-slate-600">
              Build your profile and apply to jobs matched to your skills.
            </p>
            <Link href="/signup/jobseeker" className="mt-6 inline-block w-full">
              <Button className="w-full">Sign up as Job Seeker</Button>
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Employer</h2>
            <p className="mt-2 text-sm text-slate-600">
              Register your organization and post job opportunities.
            </p>
            <Link href="/signup/employer" className="mt-6 inline-block w-full">
              <Button className="w-full">Sign up as Employer</Button>
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Admin Access</h2>
            <p className="mt-2 text-sm text-slate-600">
              Request administrative access for PESO or authorized staff.
            </p>
            <Link href="/signup/admin-request" className="mt-6 inline-block w-full">
              <Button variant="outline" className="w-full">
                Request Admin Access
              </Button>
            </Link>
          </Card>
        </div>

        <p className="text-center text-sm text-slate-600 mt-10">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
