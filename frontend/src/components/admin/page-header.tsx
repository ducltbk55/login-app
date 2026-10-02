import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "@/components/admin/icons";

/** Đầu trang chuẩn: tiêu đề + mô tả bên trái, nút hành động bên phải. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-admin-text">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm text-admin-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Link quay lại danh sách, đặt phía trên PageHeader ở các trang chi tiết. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
    >
      <ChevronLeftIcon className="size-4" />
      {children}
    </Link>
  );
}

/** Khối lọc dạng thẻ, bọc form GET ở các trang danh sách. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <form className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-admin">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
      </div>
    </form>
  );
}

/** Ô nhập trong FilterBar: nhãn nhỏ phía trên, full width ở mobile. */
export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-admin-muted">{label}</span>
      {children}
    </label>
  );
}
