"use client";

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export type ToastState = ToastProps & {
  id?: string;
};

type ToastReturn = {
  toast: (props: ToastProps) => void;
};

export function useToast(): ToastReturn {
  return {
    toast: (props: ToastProps) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app-toast", { detail: props }));
      }
    },
  };
}
