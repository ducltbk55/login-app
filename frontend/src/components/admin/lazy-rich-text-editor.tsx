"use client";

import dynamic from "next/dynamic";

/**
 * CKEditor đụng tới `window` ngay khi nạp nên chỉ chạy phía trình duyệt. Tách
 * thành chunk riêng để các trang admin khác không phải tải theo.
 */
export const RichTextEditor = dynamic(
  () => import("@/components/admin/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[30rem] animate-pulse rounded-lg border border-admin-border bg-admin-surface-2" />
    ),
  },
);
