import type { ReactNode } from "react";

import { CARD } from "@/lib/styles";

/** Khối có tiêu đề trong các form soạn thảo (bài viết, sản phẩm). */
export function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="border-b border-admin-border px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
        )}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}
