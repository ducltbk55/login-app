"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/admin/icons";

/**
 * Hộp thoại dùng chung cho khu quản trị.
 *
 * Render qua portal ra `body` để lớp phủ không bị kẹt trong stacking context
 * của thanh header (header là `sticky` + `z-index` nên tạo context riêng).
 * Ở mobile hộp thoại bám đáy màn hình cho dễ với tay.
 */
export function Dialog({
  title,
  icon,
  onClose,
  footer,
  size = "md",
  children,
}: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }[size];

  return createPortal(
    <div
      className="admin-drawer-open fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Đóng hộp thoại"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-brand-950/60 backdrop-blur-sm"
      />

      <div
        className={`relative flex max-h-[85dvh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-admin-border bg-admin-surface text-admin-text shadow-2xl`}
      >
        <div className="flex items-center gap-3 border-b border-admin-border px-5 py-4">
          {icon}
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-admin-muted transition hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="admin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-admin-border px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
