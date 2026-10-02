import type { ReactNode } from "react";

/** Khối trống dùng khi bảng/danh sách không có bản ghi nào. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-admin-text">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-admin-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
