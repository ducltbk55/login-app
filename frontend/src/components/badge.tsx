import type { ReactNode } from "react";

const TONES = {
  neutral:
    "bg-admin-surface-2 text-admin-muted ring-admin-border",
  brand: "bg-brand-500/12 text-brand-700 ring-brand-500/25 dark:text-brand-300",
  success:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
  warning:
    "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  danger: "bg-red-500/12 text-red-700 ring-red-500/25 dark:text-red-400",
  info: "bg-brand-500/12 text-brand-700 ring-brand-500/25 dark:text-brand-300",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
