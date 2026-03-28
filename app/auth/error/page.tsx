import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Authentication Error</h1>
        <p className="text-slate-600 mb-6">
          We could not complete your authentication request.
        </p>
        <Link href="/login" className="inline-block w-full">
          <Button className="w-full">Back to Login</Button>
        </Link>
      </Card>
    </div>
  );
}
