"use client";

import { AlertCircle, RefreshCcw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AdminErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  resetPath?: string;
}

export function AdminErrorState({
  title = "Something went wrong",
  message = "An error occurred while fetching data. Please try again or contact support if the problem persists.",
  onRetry,
  resetPath = "/admin/dashboard",
}: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-6 text-rose-600">
        <ShieldAlert className="w-8 h-8" />
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 text-center max-w-md mb-8">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <Button 
            onClick={onRetry} 
            className="gap-2 bg-slate-900 hover:bg-slate-800"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
        )}
        
        <Button 
          variant="outline" 
          asChild 
          className="gap-2 border-slate-200"
        >
          <a href={resetPath}>
            <Home className="w-4 h-4" />
            Back to Dashboard
          </a>
        </Button>
      </div>

      <Alert className="mt-12 max-w-xl border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 font-bold text-xs uppercase tracking-wider">Troubleshooting Tip</AlertTitle>
        <AlertDescription className="text-amber-800 text-sm">
          If you are seeing this repeatedly, try logging out and logging back in. Your session might have expired or your administrative permissions might have been updated.
        </AlertDescription>
      </Alert>
    </div>
  );
}
