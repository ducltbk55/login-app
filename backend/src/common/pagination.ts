/**
 * Phân trang ở tầng ứng dụng.
 *
 * Bộ lọc tìm kiếm phải chạy trong JS (SQLite dựng sẵn không có ICU nên
 * `COLLATE NOCASE` bỏ qua dấu tiếng Việt — xem `common/search.ts`), nên không
 * đẩy LIMIT/OFFSET xuống SQL được: phải lọc xong mới cắt trang. Danh mục trong
 * admin tối đa vài nghìn dòng nên đọc hết rồi cắt vẫn nhanh.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

export type PageQuery = { page?: number; pageSize?: number };

export type Paginated<T> = {
  /** Tổng số bản ghi khớp bộ lọc, trước khi cắt trang. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max);
}

export function paginate<T>(items: T[], query: PageQuery = {}): Paginated<T> {
  const pageSize = clamp(query.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Trang vượt quá thì trả trang cuối, tránh màn hình trắng khi đổi bộ lọc.
  const page = clamp(query.page ?? 1, 1, totalPages);
  const start = (page - 1) * pageSize;

  return {
    total,
    page,
    pageSize,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}
