"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AlertDialog = Dialog;

const AlertDialogTrigger = React.forwardRef<React.ElementRef<typeof DialogTrigger>, React.ComponentPropsWithoutRef<typeof DialogTrigger>>(
  (props, ref) => <DialogTrigger ref={ref} {...props} />
);
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogContent = DialogContent;
const AlertDialogHeader = DialogHeader;
const AlertDialogFooter = DialogFooter;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;

const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ children, ...props }, ref) => (
    <Button ref={ref} {...props}>
      {children}
    </Button>
  )
);
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ children, ...props }, ref) => (
    <Button ref={ref} variant="outline" {...props}>
      {children}
    </Button>
  )
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
