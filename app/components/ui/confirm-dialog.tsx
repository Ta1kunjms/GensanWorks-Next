"use client";

// Promise-based confirmation dialog that replaces the native browser confirm.
// Usage: const confirm = useConfirm(); if (await confirm({ title, description })) { ... }
// Focus starts on Cancel and returns to the element that was focused when confirm()
// was called. Esc and Cancel resolve false, Confirm resolves true.
// Only one confirm is open at a time: calling confirm() while another is pending
// resolves the earlier one false. Navigating to another route also resolves false.

import * as React from "react";
import { usePathname } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Uses the destructive button style for irreversible actions. */
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpenState] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  // Bumped per request so a superseding confirm remounts content and refocuses Cancel.
  const [requestId, setRequestId] = React.useState(0);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  // Mirrors `open` synchronously for the focus handlers.
  const openRef = React.useRef(false);

  const setOpen = React.useCallback((next: boolean) => {
    openRef.current = next;
    setOpenState(next);
  }, []);

  // Resolves the pending promise once; later calls are no-ops.
  const settle = React.useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const confirm = React.useCallback<ConfirmFn>(
    (next) => {
      settle(false);
      // Remember the opener, but keep the original one when a confirm is
      // chained from inside the dialog (focus is still on its buttons).
      const active = document.activeElement;
      if (active instanceof HTMLElement && !active.closest('[role="alertdialog"]')) {
        returnFocusRef.current = active;
      }
      setOptions(next);
      setRequestId((id) => id + 1);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [settle, setOpen]
  );

  // A route change cancels any open confirm.
  React.useEffect(() => {
    settle(false);
    setOpen(false);
  }, [pathname, settle, setOpen]);

  // Resolve any pending promise if the provider unmounts.
  React.useEffect(() => () => settle(false), [settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) settle(false);
        }}
      >
        {options ? (
          <AlertDialogContent
            key={requestId}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              cancelRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              // No DialogTrigger here, so Radix would drop focus to <body>.
              event.preventDefault();
              // A superseding confirm is already open and owns focus.
              if (openRef.current) return;
              const target = returnFocusRef.current;
              returnFocusRef.current = null;
              if (target?.isConnected) target.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel ref={cancelRef}>{options.cancelLabel ?? "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                variant={options.destructive ? "destructive" : "default"}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside ConfirmDialogProvider");
  }
  return confirm;
}
