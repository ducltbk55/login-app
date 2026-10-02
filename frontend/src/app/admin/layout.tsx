import { cookies } from "next/headers";

import { AdminShell } from "@/components/admin/admin-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  // Chặn ở layout nên mọi trang con /admin/* đều được bảo vệ, kể cả trang thêm sau.
  const [admin, cookieStore] = await Promise.all([requireAdmin(), cookies()]);

  // Đọc trạng thái sidebar ngay trên server để không nhấp nháy lúc tải trang.
  const collapsed = cookieStore.get("admin_sidebar")?.value === "collapsed";

  return (
    <AdminShell
      // Hộp thoại tài khoản ở header hiển thị đủ thông tin nên truyền cả bản ghi.
      admin={admin}
      signOutSlot={<SignOutButton variant="confirm" />}
      initialCollapsed={collapsed}
    >
      {children}
    </AdminShell>
  );
}
