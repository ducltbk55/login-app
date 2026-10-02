import { request, requestOptional, segment } from "./backend";

export type PermissionGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Một quyền trong danh mục cố định của backend. */
export type PermissionDef = { key: string; group: string; label: string };

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
  id: string,
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
  id: string,
  input: SavePermissionGroupInput,
): Promise<PermissionGroup> {
  return request<PermissionGroup>(`/permission-groups/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePermissionGroup(id: string): Promise<void> {
  await request<null>(`/permission-groups/${segment(id)}`, {
    method: "DELETE",
  });
}
