import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { findUserByEmail, type StoredUserDetail } from "@/lib/users";

/**
 * Cổng vào của toàn bộ khu /admin.
 *
 * Cố tình đọc vai trò từ DB chứ không tin `session.user.role`: session là JWT
 * stateless nên role/status trong đó là ảnh chụp lúc đăng nhập. Kiểm tra lại ở
 * mỗi request khiến việc hạ quyền hay khoá tài khoản có hiệu lực ngay.
 */
export async function requireAdmin(): Promise<StoredUserDetail> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await currentAdmin();
  if (!user) redirect("/dashboard?denied=admin");

  return user;
}

/**
 * Như `requireAdmin` nhưng trả `null` thay vì chuyển hướng — cho route handler
 * được gọi bằng fetch/XHR (upload ảnh từ editor), nơi một cú redirect sang
 * trang HTML chỉ khiến phía gọi báo lỗi khó hiểu.
 */
export async function currentAdmin(): Promise<StoredUserDetail | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await findUserByEmail(session.user.email);
  if (!user || user.role !== "admin" || user.status !== "active") return null;

  return user;
}
