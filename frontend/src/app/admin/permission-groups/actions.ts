"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { isSuperAdmin } from "@/lib/access";
import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  createPermissionGroup,
  deletePermissionGroup,
  findPermissionGroup,
  updatePermissionGroup,
} from "@/lib/permission-groups";
import type { StoredUserDetail } from "@/lib/users";

export type FormState = { error?: string } | null;

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || null,
    // Không tick ô nào thì getAll trả [] — đúng nghĩa "nhóm không có quyền".
    permissions: formData.getAll("permissions").map(String),
  };
}

/**
 * Chặn tự leo thang: người không phải admin chỉ được trao những quyền chính
 * mình đang có, và không được sửa/xoá nhóm mạnh hơn mình.
 */
async function assertWithinOwnPermissions(
  actor: StoredUserDetail,
  permissions: string[],
  groupId?: string | number,
): Promise<FormState> {
  if (isSuperAdmin(actor)) return null;

  const own = new Set(actor.permissions);
  const current = groupId ? await findPermissionGroup(groupId) : null;
  const missing = [...permissions, ...(current?.permissions ?? [])].filter(
    (permission) => !own.has(permission),
  );
  if (missing.length === 0) return null;

  return {
    error:
      "Bạn chỉ được thao tác với quyền mà chính mình đang có. Thiếu: " +
      [...new Set(missing)].join(", "),
  };
}

export async function createPermissionGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requirePermission("PERMISSION-GROUPS.WRITE");
  const input = readForm(formData);
  const denied = await assertWithinOwnPermissions(actor, input.permissions);
  if (denied) return denied;

  try {
    await createPermissionGroup(input);
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/permission-groups");
}

export async function updatePermissionGroupAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requirePermission("PERMISSION-GROUPS.WRITE");
  const input = readForm(formData);
  const denied = await assertWithinOwnPermissions(actor, input.permissions, id);
  if (denied) return denied;

  try {
    await updatePermissionGroup(id, input);
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/permission-groups");
}

export async function deletePermissionGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requirePermission("PERMISSION-GROUPS.WRITE");
  const id = String(formData.get("id") ?? "");
  const denied = await assertWithinOwnPermissions(actor, [], id);
  if (denied) return denied;

  try {
    await deletePermissionGroup(id);
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}
