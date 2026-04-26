import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Authentication Error</h1>
        <p className="mb-8 text-slate-600">
          We encountered an issue while signing you in. This is usually caused by a database configuration error when creating a new account.
        </p>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
          
          <p className="text-xs text-slate-400">
            If you are the developer, check your Supabase "on_auth_user_created" trigger for failing constraints.
          </p>
        </div>
      </div>
    </div>
  );
}
