import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-black/5 text-foreground/70 dark:bg-white/10",
  success:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400",
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
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
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
