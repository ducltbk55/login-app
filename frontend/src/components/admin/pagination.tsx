import Link from "next/link";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/icons";
import { ICON_BUTTON } from "@/lib/styles";

/**
 * Rút gọn dãy trang quanh trang hiện tại: 1 … 4 5 [6] 7 8 … 42.
 * `null` là chỗ chèn dấu “…”.
 */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const around = [page - 1, page, page + 1].filter(
    (p) => p > 1 && p < totalPages,
  );
  const pages = [1, ...around, totalPages];

  const result: (number | null)[] = [];
  let previous = 0;
  for (const current of pages) {
    if (current - previous > 1) result.push(null);
    result.push(current);
    previous = current;
  }
  return result;
}

const PAGE_LINK =
  "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-medium " +
  "transition tabular-nums";

/**
 * Phân trang dạng link: giữ nguyên bộ lọc hiện có trên URL và chỉ đổi `page`,
 * nhờ vậy chia sẻ/bookmark được và nút back của trình duyệt vẫn đúng.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  searchParams,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** searchParams hiện tại của trang, để giữ lại khi đổi trang. */
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      const single = Array.isArray(value) ? value[0] : value;
      if (single) params.set(key, single);
    }
    if (target > 1) params.set("page", String(target));
    return params.size > 0 ? `${basePath}?${params}` : basePath;
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-admin-muted">
        Hiển thị{" "}
        <span className="font-semibold text-admin-text tabular-nums">
          {from}–{to}
        </span>{" "}
        trong <span className="font-semibold text-admin-text">{total}</span> bản
        ghi
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              aria-label="Trang trước"
              className={ICON_BUTTON}
            >
              <ChevronLeftIcon className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden
              className={`${ICON_BUTTON} cursor-not-allowed opacity-40`}
            >
              <ChevronLeftIcon className="size-4" />
            </span>
          )}

          {pageWindow(page, totalPages).map((target, index) =>
            target === null ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-sm text-admin-muted"
              >
                …
              </span>
            ) : target === page ? (
              <span
                key={target}
                aria-current="page"
                className={`${PAGE_LINK} bg-brand-600 text-white`}
              >
                {target}
              </span>
            ) : (
              <Link
                key={target}
                href={hrefFor(target)}
                className={`${PAGE_LINK} text-admin-text hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300`}
              >
                {target}
              </Link>
            ),
          )}

          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              aria-label="Trang sau"
              className={ICON_BUTTON}
            >
              <ChevronRightIcon className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden
              className={`${ICON_BUTTON} cursor-not-allowed opacity-40`}
            >
              <ChevronRightIcon className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
