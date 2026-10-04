/**
 * Bộ lọc trang Product: tên tham số URL và cách dựng link.
 *
 * Để ở module riêng (không có "use client") vì cả trang (server) lẫn ô lọc
 * (client) đều dùng — server component import hằng số từ module client chỉ
 * nhận được tham chiếu client chứ không phải giá trị thật (xem site-nav.ts).
 */
import { PRICE_SLIDER_MAX, type ProductSort } from "./products";

/** Tên tham số trên URL — tiếng Việt cho đồng bộ với /tin-tuc?chuyen-muc=. */
export const PARAM = {
  search: "q",
  category: "linh-vuc",
  minPrice: "gia-tu",
  maxPrice: "gia-den",
  sort: "sap-xep",
  page: "page",
} as const;

export type ProductFilterValues = {
  search: string;
  categoryDetailId?: number;
  minPrice: number;
  /** Bằng PRICE_SLIDER_MAX nghĩa là không giới hạn trên. */
  maxPrice: number;
  sort: ProductSort;
};

/**
 * Dựng URL trang Product từ bộ lọc. Giá trị mặc định không ghi lên URL để
 * link gọn, và kéo kịch phải (100 triệu) = không giới hạn — sản phẩm đắt hơn
 * 100 triệu vẫn hiện.
 */
export function productsHref(values: ProductFilterValues, page = 1): string {
  const query = new URLSearchParams();
  if (values.search) query.set(PARAM.search, values.search);
  if (values.categoryDetailId) {
    query.set(PARAM.category, String(values.categoryDetailId));
  }
  if (values.minPrice > 0) query.set(PARAM.minPrice, String(values.minPrice));
  if (values.maxPrice < PRICE_SLIDER_MAX) {
    query.set(PARAM.maxPrice, String(values.maxPrice));
  }
  if (values.sort !== "launch-desc") query.set(PARAM.sort, values.sort);
  if (page > 1) query.set(PARAM.page, String(page));
  return query.size > 0 ? `/san-pham?${query}` : "/san-pham";
}
