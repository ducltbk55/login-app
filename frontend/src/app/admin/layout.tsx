import { cookies } from "next/headers";

import { AdminShell } from "@/components/admin/admin-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { buildAdminMenu } from "@/lib/access";
import { requireAdminArea } from "@/lib/admin";
import { listFunctions } from "@/lib/permission-groups";

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Cổng chung: phải là admin hoặc có ít nhất một quyền. Từng mục bên trong
  // còn có layout riêng đòi đúng quyền `.READ` của mục đó.
  const [admin, cookieStore, functions] = await Promise.all([
    requireAdminArea(),
    cookies(),
    // Không đọc được danh mục chức năng thì menu dùng thứ tự mặc định.
    listFunctions().catch(() => null),
  ]);

  // Đọc trạng thái sidebar ngay trên server để không nhấp nháy lúc tải trang.
  const collapsed = cookieStore.get("admin_sidebar")?.value === "collapsed";

  return (
    <AdminShell
      // Hộp thoại tài khoản ở header hiển thị đủ thông tin nên truyền cả bản ghi.
      admin={admin}
      // Menu theo danh mục chức năng, chỉ gồm mục người dùng có quyền xem.
      menu={buildAdminMenu(admin, functions)}
      signOutSlot={<SignOutButton />}
      initialCollapsed={collapsed}
    >
      {children}
    </AdminShell>
  );
}
