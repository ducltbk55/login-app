import { request, requestOptional, requestStream, segment } from "./backend";
import type { Paginated, PageQuery } from "./categories";

/** `draft` chưa từng lên trang, `archived` đã bán rồi ngừng. */
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Bản nháp",
  published: "Đang bán",
  archived: "Ngừng bán",
};

export const PRODUCT_SORTS = [
  "launch-desc",
  "launch-asc",
  "price-asc",
  "price-desc",
  "updated-desc",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  "launch-desc": "Mới ra mắt",
  "launch-asc": "Ra mắt lâu nhất",
  "price-asc": "Giá thấp → cao",
  "price-desc": "Giá cao → thấp",
  "updated-desc": "Mới cập nhật",
};

/** Ô kéo giá ở trang ngoài: 0 → 100 triệu. Kéo kịch phải = không giới hạn. */
export const PRICE_SLIDER_MAX = 100_000_000;
export const PRICE_SLIDER_STEP = 500_000;

/** Một dòng thông số kỹ thuật, vd. `{ label: "Camera", value: "200MP" }`. */
export type ProductSpec = { label: string; value: string };

/** Khớp giới hạn của backend (MAX_SPECS, MAX_SPEC_LABEL, MAX_SPEC_VALUE). */
export const MAX_SPECS = 60;
export const MAX_SPEC_LABEL = 80;
export const MAX_SPEC_VALUE = 500;

/** Khớp giới hạn của backend (MAX_GALLERY_IMAGES). */
export const MAX_GALLERY_IMAGES = 20;

export type ProductCategoryRef = { id: number; code: string; name: string };

/** Lĩnh vực kèm số sản phẩm, cho ô chọn và bộ lọc ở trang ngoài. */
export type ProductCategory = ProductCategoryRef & { productCount: number };

export type Product = {
  id: number;
  categoryDetailId: number;
  category: ProductCategoryRef | null;
  slug: string;
  name: string;
  sku: string | null;
  summary: string | null;
  /** HTML đã được backend lọc. */
  description: string | null;
  /** Ảnh đại diện — hiện ở lưới sản phẩm, và ở trang chi tiết khi chưa có bộ sưu tập. */
  image: string | null;
  /** Bộ sưu tập ảnh: có thì trang chi tiết chạy slideshow các ảnh này. */
  gallery: string[];
  /** Thông số kỹ thuật, đúng thứ tự hiển thị. Có thì hiện tab "Thông số kỹ thuật". */
  specs: ProductSpec[];
  /** Link video giới thiệu (YouTube/Vimeo/file). Có thì hiện tab "Video". */
  videoUrl: string | null;
  /** Giá niêm yết, VNĐ. `null` = "Liên hệ". */
  price: number | null;
  salePrice: number | null;
  launchedAt: string | null;
  status: ProductStatus;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
  /** Giá khách thực trả. */
  effectivePrice: number | null;
  discountPercent: number | null;
  live: boolean;
};

export type SaveProductInput = {
  categoryDetailId?: number;
  slug?: string;
  name?: string;
  sku?: string | null;
  summary?: string | null;
  description?: string | null;
  image?: string | null;
  gallery?: string[];
  specs?: ProductSpec[];
  videoUrl?: string | null;
  price?: number | null;
  salePrice?: number | null;
  launchedAt?: string | null;
  status?: ProductStatus;
  inStock?: boolean;
};

export type ProductQuery = PageQuery & {
  search?: string;
  status?: ProductStatus;
  categoryDetailId?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Chỉ sản phẩm đang bán — trang ngoài luôn bật cờ này. */
  live?: boolean;
  ids?: number[];
  sort?: ProductSort;
};

function toQueryString(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.categoryDetailId !== undefined) {
    params.set("categoryDetailId", String(query.categoryDetailId));
  }
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.live !== undefined) params.set("live", String(query.live));
  if (query.ids !== undefined) params.set("ids", query.ids.join(","));
  if (query.sort) params.set("sort", query.sort);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  return params.size > 0 ? `?${params}` : "";
}

export async function listProducts(
  query: ProductQuery = {},
): Promise<Paginated<Product>> {
  return request<Paginated<Product>>(`/products${toQueryString(query)}`);
}

/**
 * Tên thông số đã dùng ở các sản phẩm, xếp theo số lần dùng — để ô nhập gợi ý
 * cùng một cách gọi ("Màn hình" thay vì lúc "Màn hình", lúc "Man hinh").
 */
export async function listSpecLabels(): Promise<string[]> {
  const { items } = await listProducts({ pageSize: 200 });
  const counts = new Map<string, number>();
  for (const product of items) {
    for (const spec of product.specs ?? []) {
      counts.set(spec.label, (counts.get(spec.label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
    .map(([label]) => label);
}

export async function findProduct(
  id: string | number,
): Promise<Product | null> {
  return requestOptional<Product>(`/products/${segment(id)}`);
}

export async function findProductBySlug(
  slug: string,
): Promise<Product | null> {
  return requestOptional<Product>(`/products/slug/${segment(slug)}`);
}

/**
 * Lĩnh vực đang bật. `live` = chỉ đếm sản phẩm đang bán (trang ngoài), bỏ
 * qua = đếm tất cả (trang quản trị).
 */
export async function listProductCategories(
  live = false,
): Promise<ProductCategory[]> {
  return request<ProductCategory[]>(`/products/categories?live=${live}`);
}

export async function createProduct(
  input: SaveProductInput,
): Promise<Product> {
  return request<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string | number,
  input: SaveProductInput,
): Promise<Product> {
  return request<Product>(`/products/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string | number): Promise<void> {
  await request<null>(`/products/${segment(id)}`, { method: "DELETE" });
}

/** Đường dẫn công khai của ảnh sản phẩm — xem app/media/products/[file]. */
export function productImageUrl(file: string): string {
  return `/media/products/${encodeURIComponent(file)}`;
}

export async function uploadProductImage(image: File): Promise<string> {
  const body = new FormData();
  body.set("upload", image, image.name);
  const { file } = await request<{ file: string }>("/products/images", {
    method: "POST",
    body,
  });
  return file;
}

export async function productImage(file: string): Promise<Response> {
  return requestStream(`/products/images/${segment(file)}`);
}
