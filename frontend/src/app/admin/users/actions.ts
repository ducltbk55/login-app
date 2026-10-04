"use server";

import { refresh } from "next/cache";

import { isSuperAdmin } from "@/lib/access";
import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import { listPermissionGroups } from "@/lib/permission-groups";
import {
  findUserByEmail,
  setUserGroups,
  updateUser,
  type UserRole,
  type UserStatus,
} from "@/lib/users";

export type ActionState = { error?: string; success?: string } | null;

/**
 * Mỗi action tự kiểm tra quyền: server action là một endpoint HTTP độc lập,
 * không thừa hưởng bảo vệ của layout.
 *
 * USERS.WRITE cho phép duyệt/khoá tài khoản và gán nhóm, nhưng không được
 * dùng để tự leo thang: chỉ admin mới đổi vai trò hay đụng tới tài khoản admin,
 * và người không phải admin chỉ gán được nhóm có quyền mà chính mình đang có.
 */
export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("USERS.WRITE");

  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const status = String(formData.get("status") ?? "") as UserStatus;

  if (!isSuperAdmin(actor)) {
    const target = await findUserByEmail(email);
    if (!target) return { error: "Không tìm thấy người dùng." };
    if (target.role === "admin" || role !== target.role) {
      return {
        error:
          "Chỉ quản trị viên mới đổi được vai trò hoặc sửa tài khoản quản trị.",
      };
    }
  }

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
  const actor = await requirePermission("USERS.WRITE");

  const email = String(formData.get("email") ?? "");
  // Checkbox luôn trả chuỗi; backend validate @IsInt nên phải ép về số.
  const groupIds = formData.getAll("groupIds").map(Number);

  if (groupIds.some((id) => !Number.isInteger(id))) {
    return { error: "Danh sách nhóm quyền không hợp lệ." };
  }

  if (!isSuperAdmin(actor)) {
    if (email.toLowerCase() === actor.email.toLowerCase()) {
      return { error: "Bạn không thể tự đổi nhóm quyền của chính mình." };
    }
    const target = await findUserByEmail(email);
    if (target?.role === "admin") {
      return { error: "Chỉ quản trị viên mới sửa được tài khoản quản trị." };
    }

    const own = new Set(actor.permissions);
    const chosen = new Set(groupIds);
    const tooStrong = (await listPermissionGroups()).filter(
      (group) =>
        chosen.has(group.id) && group.permissions.some((p) => !own.has(p)),
    );
    if (tooStrong.length > 0) {
      return {
        error:
          `Bạn không gán được nhóm có quyền mà mình không có: ` +
          tooStrong.map((g) => g.name).join(", "),
      };
    }
  }

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
