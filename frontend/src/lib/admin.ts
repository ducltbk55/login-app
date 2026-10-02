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

  const user = await findUserByEmail(session.user.email);
  if (!user || user.role !== "admin" || user.status !== "active") {
    redirect("/dashboard?denied=admin");
  }

  return user;
}
