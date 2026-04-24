import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <Card className="border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Authentication Error</h1>
          <p className="mb-6 text-slate-300">
          We could not complete your authentication request.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="inline-block w-full">
              <Button className="w-full">Back to Login</Button>
            </Link>
            <Link href="/contact" className="inline-block w-full">
              <Button variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10">
                Contact Support
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
