import { request, requestOptional, segment } from "./backend";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveCategoryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export async function listCategories(
  query: { search?: string; isActive?: boolean } = {},
): Promise<Category[]> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.isActive !== undefined) {
    params.set("isActive", String(query.isActive));
  }

  const suffix = params.size > 0 ? `?${params}` : "";
  const result = await request<{ total: number; items: Category[] }>(
    `/categories${suffix}`,
  );
  return result.items;
}

export async function findCategory(id: string): Promise<Category | null> {
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
  id: string,
  input: SaveCategoryInput,
): Promise<Category> {
  return request<Category>(`/categories/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await request<null>(`/categories/${segment(id)}`, { method: "DELETE" });
}
