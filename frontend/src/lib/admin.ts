import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { canEnterAdmin, can, type Permission } from "@/lib/access";
import { findUserByEmail, type StoredUserDetail } from "@/lib/users";

/**
 * Bản ghi người dùng đang đăng nhập, đọc lại từ DB.
 *
 * Cố tình không tin `session.user.role`: session là JWT stateless nên vai trò
 * trong đó là ảnh chụp lúc đăng nhập. Đọc lại ở mỗi request khiến việc hạ
 * quyền, gỡ khỏi nhóm hay khoá tài khoản có hiệu lực ngay. `cache` gộp các lần
 * gọi trong cùng một request (layout + trang + action) thành một lần đọc.
 */
export const currentUser = cache(async (): Promise<StoredUserDetail | null> => {
  const session = await auth();
  if (!session?.user?.email) return null;
  return findUserByEmail(session.user.email);
});

/**
 * Cổng vào khu /admin: admin, hoặc người được gán nhóm quyền có ít nhất một
 * quyền. Từng mục bên trong còn tự kiểm tra quyền riêng (`requirePermission`).
 */
export async function requireAdminArea(): Promise<StoredUserDetail> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await currentUser();
  if (!user || !canEnterAdmin(user)) redirect("/dashboard?denied=admin");

  return user;
}

/**
 * Bắt buộc có quyền `permission`. Dùng ở layout/trang của từng mục và ở MỌI
 * server action: action là một endpoint HTTP độc lập, không thừa hưởng bảo vệ
 * của layout.
 */
export async function requirePermission(
  permission: Permission,
): Promise<StoredUserDetail> {
  const user = await requireAdminArea();
  if (!can(user, permission)) {
    redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  }
  return user;
}

/**
 * Như `requirePermission` nhưng trả `null` thay vì chuyển hướng — cho route
 * handler được gọi bằng fetch/XHR (upload ảnh từ editor), nơi một cú redirect
 * sang trang HTML chỉ khiến phía gọi báo lỗi khó hiểu.
 */
export async function currentUserWith(
  permission: Permission,
): Promise<StoredUserDetail | null> {
  const user = await currentUser();
  return user && can(user, permission) ? user : null;
}
