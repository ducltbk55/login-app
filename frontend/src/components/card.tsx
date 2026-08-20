import type { ReactNode } from "react";

/** Khung viền bo góc dùng chung cho các khối nội dung chính. */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/10 p-8 dark:border-white/15 ${className}`}
    >
      {children}
    </div>
  );
}
