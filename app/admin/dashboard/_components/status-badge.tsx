import type { ReactNode } from "react";

type StatusBadgeProps = {
  label: string;
  className: string;
  icon?: ReactNode;
};

export function StatusBadge({ label, className, icon }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {icon}
      {label}
    </span>
  );
}
