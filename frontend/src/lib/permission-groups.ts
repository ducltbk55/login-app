import { request, requestOptional, segment } from "./backend";

export type PermissionGroup = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Một quyền đọc từ danh mục quyền (`DM_QUYEN`) trong DB.
 * `key` chính là mã chi tiết danh mục, `group` suy ra từ phần trước dấu chấm.
 */
export type PermissionDef = {
  key: string;
  group: string;
  label: string;
  description: string | null;
};

export type SavePermissionGroupInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  permissions?: string[];
};

export async function listPermissions(): Promise<PermissionDef[]> {
  const result = await request<{ items: PermissionDef[] }>("/permissions");
  return result.items;
}

export async function listPermissionGroups(): Promise<PermissionGroup[]> {
  const result = await request<{ total: number; items: PermissionGroup[] }>(
    "/permission-groups",
  );
  return result.items;
}

export async function findPermissionGroup(
  id: string | number,
): Promise<PermissionGroup | null> {
  return requestOptional<PermissionGroup>(`/permission-groups/${segment(id)}`);
}

export async function createPermissionGroup(
  input: SavePermissionGroupInput,
): Promise<PermissionGroup> {
  return request<PermissionGroup>("/permission-groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePermissionGroup(
  id: string | number,
  input: SavePermissionGroupInput,
): Promise<PermissionGroup> {
  return request<PermissionGroup>(`/permission-groups/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePermissionGroup(id: string | number): Promise<void> {
  await request<null>(`/permission-groups/${segment(id)}`, {
    method: "DELETE",
  });
}

/** Mã của danh mục chứa toàn bộ quyền hệ thống (backend seed sẵn). */
export const PERMISSION_CATEGORY_CODE = "DM_QUYEN";

/**
 * Đường dẫn tới danh sách chi tiết của danh mục quyền — nơi admin thêm/sửa
 * quyền. Nếu vì lý do nào đó danh mục chưa có thì về trang danh mục chung.
 */
export async function findPermissionCatalogHref(): Promise<string> {
  const { listAllCategories } = await import("./categories");
  const found = (
    await listAllCategories({ search: PERMISSION_CATEGORY_CODE })
  ).find((category) => category.code === PERMISSION_CATEGORY_CODE);

  return found ? `/admin/categories/${found.id}/details` : "/admin/categories";
}
