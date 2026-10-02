"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  createPermissionGroup,
  deletePermissionGroup,
  updatePermissionGroup,
} from "@/lib/permission-groups";

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

export async function createPermissionGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await createPermissionGroup(readForm(formData));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/permission-groups");
}

export async function updatePermissionGroupAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await updatePermissionGroup(id, readForm(formData));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/permission-groups");
}

export async function deletePermissionGroupAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  await deletePermissionGroup(String(formData.get("id") ?? ""));
  refresh();
}
