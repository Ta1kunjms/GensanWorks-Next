import { toast } from "sonner";

export interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  requestId?: string;
}

/**
 * Handles API errors in a user-friendly way.
 * Translates technical error codes and trigger toasts.
 */
export async function handleApiError(
  response: Response,
  options: {
    showToast?: boolean;
    fallbackMessage?: string;
  } = {}
) {
  const { showToast = true, fallbackMessage = "Something went wrong. Please try again." } = options;

  let errorData: ApiErrorResponse | null = null;
  try {
    errorData = await response.json();
  } catch {
    // If not JSON, we'll use the fallback
  }

  const message = errorData?.message || errorData?.error || fallbackMessage;
  const code = errorData?.code;

  if (showToast) {
    switch (code) {
      case "UNAUTHORIZED":
        toast.error("Please log in to continue.", {
          description: "Your session may have expired.",
        });
        break;
      case "FORBIDDEN":
        toast.error("You don't have permission for this.", {
          description: "If you think this is a mistake, please contact support.",
        });
        break;
      case "RATE_LIMITED":
        toast.warning("Too many requests.", {
          description: "Please wait a moment before trying again.",
        });
        break;
      case "VALIDATION_ERROR":
        toast.error("Check your input.", {
          description: "Some fields are missing or invalid.",
        });
        break;
      default:
        toast.error(message, {
          description: errorData?.requestId ? `ID: ${errorData.requestId}` : undefined,
        });
    }
  }

  return {
    message,
    code,
    details: errorData?.details,
    requestId: errorData?.requestId,
  };
}

/**
 * Specifically for Zod/Validation errors to be used in forms
 */
export function getFieldErrors(details?: Record<string, any>): Record<string, string> {
  if (!details) return {};
  
  const errors: Record<string, string> = {};
  Object.entries(details).forEach(([key, value]) => {
    if (typeof value === 'string') {
      errors[key] = value;
    }
  });
  
  return errors;
}
