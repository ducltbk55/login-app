"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  setUserGroups,
  updateUser,
  type UserRole,
  type UserStatus,
} from "@/lib/users";

export type ActionState = { error?: string; success?: string } | null;

/**
 * Mỗi action tự gọi requireAdmin(): server action là một endpoint HTTP độc lập,
 * không thừa hưởng bảo vệ của layout.
 */
export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const status = String(formData.get("status") ?? "") as UserStatus;

  try {
    await updateUser(email, { role, status });
  } catch (error) {
    return { error: message(error) };
  }

  refresh();
  return { success: "Đã cập nhật vai trò và trạng thái." };
}

export async function setUserGroupsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "");
  const groupIds = formData.getAll("groupIds").map(String);

  try {
    await setUserGroups(email, groupIds);
  } catch (error) {
    return { error: message(error) };
  }

  refresh();
  return { success: "Đã cập nhật nhóm quyền." };
}

function message(error: unknown): string {
  if (error instanceof BackendError) return error.message;
  throw error;
}
