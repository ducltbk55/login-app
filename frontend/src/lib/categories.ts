import { request, requestOptional, segment } from "./backend";

/** Dùng chung cho danh mục và chi tiết danh mục. */
export type CategoryStatus = "active" | "inactive";

/** Tham chiếu gọn tới danh mục / chi tiết đang đóng vai trò "nhóm". */
export type GroupRef = { id: number; code: string; name: string };

export type Category = {
  id: number;
  code: string;
  name: string;
  descriptions: string | null;
  order: number;
  status: CategoryStatus;
  /** Danh mục dùng để phân nhóm các chi tiết của danh mục này. */
  groupCategoryId: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Bản ghi trong danh sách có kèm số chi tiết. */
export type CategorySummary = Category & {
  detailCount: number;
  groupCategory: GroupRef | null;
};

export type CategoryDetail = Category & {
  categoryId: number;
  /** Chi tiết (thuộc danh mục nhóm) mà bản ghi này được xếp vào. */
  groupDetailId: number | null;
  group: GroupRef | null;
};

export type SaveCategoryInput = {
  code?: string;
  name?: string;
  descriptions?: string | null;
  order?: number;
  status?: CategoryStatus;
  /** `null` = bỏ phân nhóm; không gửi = giữ nguyên. */
  groupCategoryId?: number | null;
};

export type SaveCategoryDetailInput = SaveCategoryInput & {
  groupDetailId?: number | null;
};

/** Bao ngoài của mọi danh sách có phân trang từ backend. */
export type Paginated<T> = {
  /** Tổng số bản ghi khớp bộ lọc, trước khi cắt trang. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
};

export const DEFAULT_PAGE_SIZE = 20;
/** Trùng với MAX_PAGE_SIZE của backend; dùng cho các ô select cần nạp hết. */
export const MAX_PAGE_SIZE = 200;

export type PageQuery = { page?: number; pageSize?: number };

export type CategoryQuery = PageQuery & {
  search?: string;
  status?: CategoryStatus;
};

export type CategoryDetailQuery = CategoryQuery & { groupDetailId?: number };

function toQueryString(query: CategoryDetailQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.groupDetailId !== undefined) {
    params.set("groupDetailId", String(query.groupDetailId));
  }
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  return params.size > 0 ? `?${params}` : "";
}

/* ---------------------------------------------------------------- danh mục */

export async function listCategories(
  query: CategoryQuery = {},
): Promise<Paginated<CategorySummary>> {
  return request<Paginated<CategorySummary>>(
    `/categories${toQueryString(query)}`,
  );
}

/**
 * Nạp hết danh mục cho các ô select. Hệ thống chỉ có vài chục danh mục nên một
 * trang lớn là đủ — chi tiết thì phải dùng `listCategoryDetails` có phân trang.
 */
export async function listAllCategories(
  query: Omit<CategoryQuery, "page" | "pageSize"> = {},
): Promise<CategorySummary[]> {
  const result = await listCategories({ ...query, pageSize: MAX_PAGE_SIZE });
  return result.items;
}

export async function findCategory(
  id: string | number,
): Promise<Category | null> {
  return requestOptional<Category>(`/categories/${segment(id)}`);
}

export async function createCategory(
  input: SaveCategoryInput,
): Promise<Category> {
  return request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string | number,
  input: SaveCategoryInput,
): Promise<Category> {
  return request<Category>(`/categories/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string | number): Promise<void> {
  await request<null>(`/categories/${segment(id)}`, { method: "DELETE" });
}

/* ------------------------------------------------ chi tiết của một danh mục */

/** Mọi endpoint chi tiết đều lồng dưới danh mục cha, kể cả khi đã có id. */
function detailPath(categoryId: string | number, id?: string | number): string {
  const base = `/categories/${segment(categoryId)}/details`;
  return id ? `${base}/${segment(id)}` : base;
}

export async function listCategoryDetails(
  categoryId: string | number,
  query: CategoryDetailQuery = {},
): Promise<Paginated<CategoryDetail>> {
  return request<Paginated<CategoryDetail>>(
    `${detailPath(categoryId)}${toQueryString(query)}`,
  );
}

/** Một trang lớn, dùng cho ô chọn nhóm (danh mục nhóm thường chỉ vài chục mục). */
export async function listAllCategoryDetails(
  categoryId: string | number,
  query: Omit<CategoryDetailQuery, "page" | "pageSize"> = {},
): Promise<CategoryDetail[]> {
  const result = await listCategoryDetails(categoryId, {
    ...query,
    pageSize: MAX_PAGE_SIZE,
  });
  return result.items;
}

export async function findCategoryDetail(
  categoryId: string | number,
  id: string | number,
): Promise<CategoryDetail | null> {
  return requestOptional<CategoryDetail>(detailPath(categoryId, id));
}

export async function createCategoryDetail(
  categoryId: string | number,
  input: SaveCategoryDetailInput,
): Promise<CategoryDetail> {
  return request<CategoryDetail>(detailPath(categoryId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCategoryDetail(
  categoryId: string | number,
  id: string | number,
  input: SaveCategoryDetailInput,
): Promise<CategoryDetail> {
  return request<CategoryDetail>(detailPath(categoryId, id), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCategoryDetail(
  categoryId: string | number,
  id: string | number,
): Promise<void> {
  await request<null>(detailPath(categoryId, id), { method: "DELETE" });
}
